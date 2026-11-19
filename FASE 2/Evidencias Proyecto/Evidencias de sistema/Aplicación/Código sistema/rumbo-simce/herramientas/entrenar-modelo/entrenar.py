# Entrena una CNN pequeña de dígitos (0-9) y la exporta a ONNX.
# Datos: 10 000 muestras MNIST (paquete npm "mnist"), aumentadas para parecerse a trazos de dedo/lápiz.
import json, random, numpy as np, torch, torch.nn as nn, torch.nn.functional as F, sys, os
torch.manual_seed(7); np.random.seed(7); random.seed(7)
torch.set_num_threads(2)
D=os.environ.get('MNIST_DIR',os.path.join(os.path.dirname(__file__),'node_modules/mnist/src/digits'))
X=[];Y=[]
for d in range(10):
    a=np.array(json.load(open(f'{D}/{d}.json'))['data'],dtype=np.float32).reshape(-1,28,28)
    X.append(a);Y+= [d]*len(a)
X=np.concatenate(X);Y=np.array(Y)
idx=np.random.permutation(len(X));X=X[idx];Y=Y[idx]
nte=1500
Xte,Yte=torch.tensor(X[:nte])[:,None],torch.tensor(Y[:nte])
Xtr,Ytr=torch.tensor(X[nte:])[:,None],torch.tensor(Y[nte:])
print('train',len(Xtr),'test',len(Xte))

def recentrar(x):
    # vuelve a normalizar como en producción: caja 20x20 + centro de masa en (14,14)
    out=torch.zeros_like(x)
    for i in range(x.shape[0]):
        im=x[i,0];m=im>0.1
        if m.sum()==0: continue
        ys,xs=torch.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        c=im[y0:y1,x0:x1];h,w=c.shape;s=20.0/max(h,w)
        nh,nw=max(1,int(round(h*s))),max(1,int(round(w*s)))
        c=F.interpolate(c[None,None],size=(nh,nw),mode='bilinear',align_corners=False)[0,0]
        tot=c.sum()+1e-6;yy,xx=torch.meshgrid(torch.arange(nh),torch.arange(nw),indexing='ij')
        cy=(c*yy).sum()/tot;cx=(c*xx).sum()/tot
        oy=int(round(14-cy.item()));ox=int(round(14-cx.item()))
        oy=min(max(oy,0),28-nh);ox=min(max(ox,0),28-nw)
        out[i,0,oy:oy+nh,ox:ox+nw]=c
    return out.clamp(0,1)

def aumentar(x):
    n=x.shape[0]
    ang=(torch.rand(n)*2-1)*0.26          # ±15°
    sc=0.80+torch.rand(n)*0.35
    sh=(torch.rand(n)*2-1)*0.30
    asp=0.75+torch.rand(n)*0.5            # ancho/alto variable (niños escriben anchos o angostos)
    c,s=torch.cos(ang),torch.sin(ang)
    A=torch.zeros(n,2,3)
    A[:,0,0]=c/sc/asp; A[:,0,1]=(-s+sh)/sc; A[:,1,0]=s/sc/asp; A[:,1,1]=c/sc
    A[:,:,2]=(torch.rand(n,2)*2-1)*0.08
    g=F.affine_grid(A,x.shape,align_corners=False)
    y=F.grid_sample(x,g,align_corners=False,padding_mode='zeros')
    # grosor de trazo variable
    r=torch.rand(n)
    dil=F.max_pool2d(y,3,1,1); ero=-F.max_pool2d(-y,3,1,1)
    y=torch.where((r<0.3)[:,None,None,None],dil,torch.where((r>0.85)[:,None,None,None],ero,y))
    # trazos de grosor uniforme (como el lienzo): binariza y suaviza a veces
    b=torch.rand(n)<0.5
    yb=(y>0.35).float(); yb=F.avg_pool2d(yb,3,1,1)*0.6+yb*0.4
    y=torch.where(b[:,None,None,None],yb,y)
    y=recentrar(y)
    return y

class Red(nn.Module):
    def __init__(s):
        super().__init__()
        s.c1=nn.Conv2d(1,32,3,padding=1);s.b1=nn.BatchNorm2d(32)
        s.c2=nn.Conv2d(32,32,3,padding=1);s.b2=nn.BatchNorm2d(32)
        s.c3=nn.Conv2d(32,64,3,padding=1);s.b3=nn.BatchNorm2d(64)
        s.c4=nn.Conv2d(64,64,3,padding=1);s.b4=nn.BatchNorm2d(64)
        s.f1=nn.Linear(64*7*7,128);s.dr=nn.Dropout(0.35);s.f2=nn.Linear(128,10)
    def forward(s,x):
        x=F.relu(s.b1(s.c1(x)));x=F.max_pool2d(F.relu(s.b2(s.c2(x))),2)
        x=F.relu(s.b3(s.c3(x)));x=F.max_pool2d(F.relu(s.b4(s.c4(x))),2)
        x=s.dr(F.relu(s.f1(x.flatten(1))));return s.f2(x)

m=Red();opt=torch.optim.AdamW(m.parameters(),2e-3,weight_decay=1e-4)
EP=int(sys.argv[1]) if len(sys.argv)>1 else 14
sched=torch.optim.lr_scheduler.OneCycleLR(opt,3e-3,total_steps=EP*((len(Xtr)+127)//128))
def evaluar(xs,ys):
    m.eval()
    with torch.no_grad(): p=m(xs).argmax(1)
    return (p==ys).float().mean().item()
for ep in range(EP):
    m.train();perm=torch.randperm(len(Xtr));tl=0
    for i in range(0,len(Xtr),128):
        j=perm[i:i+128];xb=aumentar(Xtr[j]);yb=Ytr[j]
        loss=F.cross_entropy(m(xb),yb,label_smoothing=0.05)
        opt.zero_grad();loss.backward();opt.step();sched.step();tl+=loss.item()*len(j)
    torch.manual_seed(99)
    print(f'ep{ep+1} loss {tl/len(Xtr):.3f} test {evaluar(Xte,Yte):.4f} test_aum {evaluar(aumentar(Xte),Yte):.4f}',flush=True)
m.eval()
torch.onnx.export(m,torch.zeros(1,1,28,28),os.path.join(os.path.dirname(__file__),'../../backend/modelos/digitos.onnx'),
  input_names=['imagen'],output_names=['logits'],dynamic_axes={'imagen':{0:'n'},'logits':{0:'n'}},opset_version=17,dynamo=False)
print('exportado')
