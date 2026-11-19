"""Generador reproducible de la ampliación curricular v14 (solo desarrollo).
Ejecutar con Python 3 si se desea regenerar el SQL. El equipo NO requiere Python para instalar el proyecto:
el archivo seeds/008_ampliacion_practicas_v14.sql ya está incluido y es la fuente aplicada por npm run db:seed.
150 preguntas originales, 15 lecciones, dos hojas con cinco ejercicios por lección.
"""
import json, random, pathlib
from collections import Counter
ROOT=pathlib.Path(__file__).resolve().parents[1]
LESSONS=[]

def N(en,answer,alts,ex,oa,skill='numerica'):
    return (en,str(answer),[str(x) for x in alts],ex,oa,skill)
def L(u,c,titulo,oa,ej1,ej2,questions):
    assert len(questions)==10,(u,c,len(questions))
    LESSONS.append(dict(u=u,c=c,titulo=titulo,oa=oa,ejemplos=[ej1,ej2],preguntas=questions))

# UNIDAD 1 — lectura, valor posicional, adición y sustracción.
L(1,4,'Números que encontramos a diario','OA1',
 ('En una biblioteca hay 3.205 libros. ¿Cómo se descompone?', '3.000 + 200 + 5 representa 3.205: ubica millares, centenas, decenas y unidades.'),
 ('Un marcador señala 4.000 y avanza de mil en mil. ¿Qué sigue?', '4.000 + 1.000 = 5.000. La recta indica intervalos iguales.'),[
 N('Un cartel municipal dice 4.206 habitantes. ¿Cómo se escribe en palabras?','cuatro mil doscientos seis',['cuatro mil veintiséis','cuatro mil sesenta y dos','cuatrocientos veintiséis'],'Se separan millares, centenas y unidades.','OA1','verbal'),
 N('En una etiqueta aparece «siete mil cuarenta y tres». ¿Cuál es su escritura en cifras?','7.043',['7.403','7.430','743'],'Siete miles, cuatro decenas y tres unidades.','OA1'),
 N('En un registro hay 3.412 y 3.421. ¿Cuál corresponde a la cantidad mayor?','3.421',['3.412'],'Miles y centenas iguales; 2 decenas supera 1 decena.','OA1'),
 N('Una caja registradora muestra 6.583. ¿Qué valor tiene el dígito [[5]] destacado?','500',['5','50','5.000'],'El 5 está en el lugar de las centenas.','OA1'),
 N('La combinación de 8 millares, 2 centenas y 7 unidades forma el número…','8.207',['8.270','8.027','8.720'],'8.000 + 200 + 7 = 8.207.','OA1'),
 N('En la recta numérica: 1.000 → 2.000 → 3.000 → ____. ¿Qué número sigue?','4.000',['3.100','5.000','3.010'],'La separación es de mil unidades.','OA1'),
 N('Un cajero entrega 3 billetes de $1.000 y 4 de $100. ¿Cuánto dinero entrega?','$3.400',['$3.040','$4.300','$7.000'],'Tres millares y cuatro centenas suman $3.400.','OA1'),
 N('Una clave es mayor que 5.099 y menor que 5.102. ¿Cuál de estos números cumple?','5.100',['5.098','5.103','5.090'],'5.100 está dentro del intervalo indicado.','OA1'),
 N('La máquina separó 9.061 en bloques: 9.000 + ____ + 1. ¿Qué falta?','60',['600','6','6000'],'9.061 = 9.000 + 60 + 1.','OA1'),
 N('Entre 7.099 y 7.101 hay exactamente un entero. ¿Cuál es?','7.100',['7.090','7.110','7.200'],'El sucesor de 7.099 es 7.100.','OA1'),
])
L(1,5,'Sumas para organizar actividades','OA3',
 ('Para una feria se anotan 240 y 120 entradas vendidas. ¿Cuál es el total?', '240 + 120 = 360 entradas; sumar significa reunir cantidades.'),
 ('En una cuenta se suman 120 + 80 + 30. ¿Cómo hacerlo rápido?', '120 + 80 = 200; luego + 30 = 230. Agrupar facilita el cálculo.'),[
 N('En una campaña juntaron 248 tapitas el lunes y 173 el martes. ¿Cuántas reunieron?','421',['411','321','431'],'248 + 173 = 421.','OA3'),
 N('El museo recibió 125 visitas en la mañana, 86 al mediodía y 104 en la tarde. ¿Total de visitas?','315',['305','325','415'],'125 + 86 + 104 = 315.','OA3'),
 N('Una familia ahorró $370 y luego otros $290. ¿Cuánto acumula?','$660',['$560','$670','$760'],'370 + 290 = 660.','OA3'),
 N('En un taller habían 398 piezas y llegan 101. Sin hacer el algoritmo completo, ¿cuál es la mejor estimación?','cerca de 500',['cerca de 200','cerca de 800','cerca de 1.000'],'398 se aproxima a 400 y 101 a 100.','OA3'),
 N('Un marcador muestra 169 puntos. El equipo obtiene 47 más. ¿Cuál es el nuevo puntaje?','216',['206','226','116'],'169 + 47 = 216.','OA3'),
 N('Para equipar una sala se compran 234 lápices, 156 gomas y 110 reglas. ¿Cuántos objetos son?','500',['490','400','510'],'234 + 156 + 110 = 500.','OA3'),
 N('Una colecta reunió 75 monedas, después 125 y finalmente 50. ¿Qué total tiene?','250',['225','200','275'],'75 + 125 + 50 = 250.','OA3'),
 N('Un catálogo registra 397 láminas y recibe 203 nuevas. ¿Qué suma permite completar la centena?','397 + 203 = 600',['397 + 203 = 500','397 + 203 = 590','397 + 203 = 700'],'397 necesita 3 para 400 y sobran 200: 600.','OA3','verbal'),
 N('La profesora corrige 128 pruebas, luego 99 y después 73. ¿Cuántas corrige en total?','300',['290','310','400'],'128 + 99 + 73 = 300.','OA3'),
 N('En la ruta escolar suben 17 niños y ya viajaban 28. Luego suben 15 más. ¿Cuántos van ahora?','60',['50','55','70'],'28 + 17 + 15 = 60.','OA3'),
])
L(1,6,'Restas y decisiones numéricas','OA3',
 ('En un estante hay 600 cajas; se retiran 150. ¿Cuántas quedan?', '600 - 150 = 450. Restar permite saber cuántas quedan.'),
 ('¿Qué operación usar para saber cuántos faltan de 225 a 300?', 'Se calcula 300 - 225 = 75, porque buscamos la diferencia.'),[
 N('En un huerto había 825 semillas; se sembraron 348. ¿Cuántas quedan?','477',['487','577','467'],'825 - 348 = 477.','OA3'),
 N('Un teatro tiene 600 asientos; 275 están ocupados. ¿Cuántos están libres?','325',['375','225','425'],'600 - 275 = 325.','OA3'),
 N('Una excursión cuesta $940 y Ana posee $685. ¿Cuánto le falta?','$255',['$245','$265','$355'],'940 - 685 = 255.','OA3'),
 N('El contador de bicicletas pasa de 704 a 389 tras una revisión. ¿Cuál fue la disminución?','315',['325','305','415'],'704 - 389 = 315.','OA3'),
 N('Una biblioteca tenía 500 revistas; prestó 96. ¿Qué estimación es más razonable?','quedan cerca de 400',['quedan cerca de 100','quedan cerca de 50','quedan cerca de 600'],'500 - 100 ≈ 400.','OA3','verbal'),
 N('De 730 metros de sendero, se han reparado 485. ¿Qué longitud queda por reparar?','245 m',['255 m','345 m','235 m'],'730 - 485 = 245.','OA3'),
 N('Hay 423 entradas. Se venden 180 y luego otras 70. ¿Cuántas sobran?','173',['183','273','163'],'423 - 180 - 70 = 173.','OA3'),
 N('Para llegar a 900 puntos, una jugadora que tiene 639 necesita…','261',['271','161','361'],'900 - 639 = 261.','OA3'),
 N('Un tanque tiene 780 litros; se usan 125 y después 225. ¿Cuántos litros quedan?','430',['440','530','330'],'780 - 125 - 225 = 430.','OA3'),
 N('El gráfico de ventas indica 250 en junio y 187 en julio. ¿Cuántas ventas menos hubo en julio?','63',['73','53','437'],'250 - 187 = 63.','OA3'),
])
# UNIDAD 2 — productos, cocientes, dinero y razonamiento contextual.
L(2,4,'Multiplicar pensando, no solo memorizando','OA5',
 ('Una caja tiene 12 lápices. Cinco cajas tienen…', '12 × 5 = 60; también 10 × 5 + 2 × 5 = 60.'),
 ('Cuatro filas tienen 23 asientos cada una.', '23 × 4 = (20 × 4) + (3 × 4) = 92.'),[
 N('Un vivero prepara 123 plantitas en cada una de 3 mesas. ¿Cuántas hay?','369',['366','359','469'],'123 × 3 = 369.','OA5'),
 N('Cada página de un álbum tiene 24 casillas. Si hay 4 páginas, ¿cuántas casillas?','96',['84','106','86'],'24 × 4 = 96.','OA5'),
 N('Para calcular 36 × 5 sin calculadora, ¿qué descomposición es correcta?','(30 × 5) + (6 × 5)',['30 + 6 × 5','(30 × 6) + 5','36 + 5'],'Se distribuye la multiplicación en decenas y unidades.','OA5','verbal'),
 N('Una imprenta empaqueta 215 folletos por caja. Con 4 cajas, ¿cuántos folletos?','860',['840','960','760'],'215 × 4 = 860.','OA5'),
 N('Se colocan 6 filas de 18 macetas. ¿Cuál operación representa el arreglo?','6 × 18',['6 + 18','18 − 6','18 ÷ 6'],'Filas por elementos de cada fila.','OA5'),
 N('El precio de un cuaderno es $145. ¿Cuánto cuestan 3 cuadernos?','$435',['$445','$335','$535'],'145 × 3 = 435.','OA5'),
 N('Una corredora da 4 vueltas de 125 m cada una. ¿Qué distancia recorre?','500 m',['450 m','400 m','525 m'],'125 × 4 = 500.','OA5'),
 N('¿Qué estimación se acerca más a 198 × 3?','600',['300','900','200'],'198 ≈ 200, luego 200 × 3 = 600.','OA5'),
 N('Dos bandejas tienen 307 semillas cada una. ¿Cuál es el total?','614',['604','714','612'],'307 × 2 = 614.','OA5'),
 N('Una panadería hornea 112 panes por tanda y realiza 5 tandas. ¿Cuántos panes?','560',['550','570','460'],'112 × 5 = 560.','OA5'),
])
L(2,5,'Repartos equitativos y cocientes','OA6',
 ('Se reparten 36 lápices en 4 estuches iguales.', '36 ÷ 4 = 9 por estuche; comprueba 9 × 4 = 36.'),
 ('Una excursión organiza 48 alumnos en 6 equipos.', '48 ÷ 6 = 8 por equipo.'),[
 N('La biblioteca reparte 72 marcapáginas en 8 grupos iguales. ¿Cuántos recibe cada grupo?','9',['8','7','10'],'72 ÷ 8 = 9.','OA6'),
 N('Una tienda distribuye 63 pelotas en 7 canastos iguales. ¿Cuántas por canasto?','9',['8','7','6'],'63 ÷ 7 = 9.','OA6'),
 N('Para comprobar 54 ÷ 6 = 9, ¿qué multiplicación corresponde?','9 × 6 = 54',['6 × 6 = 54','9 × 9 = 54','54 × 6 = 9'],'La multiplicación es inversa de la división.','OA6','verbal'),
 N('Se forman paquetes de 5 pegatinas con 45 pegatinas. ¿Cuántos paquetes completos?','9',['8','7','10'],'45 ÷ 5 = 9.','OA6'),
 N('El capitán tiene 84 fichas para 7 integrantes. ¿Cuántas recibe cada integrante?','12',['11','13','14'],'84 ÷ 7 = 12.','OA6'),
 N('Un huerto divide 96 semillas en 8 surcos iguales. ¿Cuántas por surco?','12',['10','14','16'],'96 ÷ 8 = 12.','OA6'),
 N('Si 42 sillas se reparten en 6 filas iguales, ¿qué expresión resuelve el problema?','42 ÷ 6',['42 × 6','42 + 6','42 − 6'],'Se divide el total en grupos iguales.','OA6','verbal'),
 N('Una caja de 75 libros se reparte entre 5 aulas. ¿Cuántos libros recibe cada aula?','15',['10','12','20'],'75 ÷ 5 = 15.','OA6'),
 N('Para hallar 68 ÷ 4, separa 68 en 40 y 28. ¿Qué cociente se obtiene?','17',['14','15','18'],'40 ÷ 4 + 28 ÷ 4 = 10 + 7 = 17.','OA6'),
 N('Hay 81 postales para 9 expositores. ¿Cuántas postales recibe cada uno?','9',['7','8','10'],'81 ÷ 9 = 9.','OA6'),
])
L(2,6,'Pequeñas decisiones con dinero','OA7',
 ('Si pagas $500 por algo de $350, el vuelto es…', '$500 − $350 = $150.'),
 ('Tres boletos cuestan $200 cada uno.', '200 × 3 = $600. Multiplicamos el precio unitario.'),[
 N('Tomás compra un jugo de $420 y un pan de $350. ¿Cuál es el costo total?','$770',['$670','$870','$760'],'420 + 350 = 770.','OA7'),
 N('Un boleto cuesta $180. ¿Cuánto cuestan cuatro boletos?','$720',['$620','$740','$820'],'180 × 4 = 720.','OA7'),
 N('Pagas $1.000 por una fruta que cuesta $675. ¿Cuál es tu vuelto?','$325',['$225','$335','$425'],'1.000 − 675 = 325.','OA7'),
 N('Un grupo reúne $900 para comprar 3 juegos iguales. ¿Cuánto puede costar cada juego?','$300',['$200','$400','$600'],'900 ÷ 3 = 300.','OA7'),
 N('Martina lleva $800. Compra un lápiz de $250 y un borrador de $180. ¿Cuánto conserva?','$370',['$430','$470','$270'],'800 − 250 − 180 = 370.','OA7'),
 N('Una colación cuesta $240. ¿Qué operación permite saber el costo de cinco colaciones?','240 × 5',['240 ÷ 5','240 − 5','240 + 5'],'El mismo precio se repite cinco veces.','OA7','verbal'),
 N('Dos billetes de $1.000 y tres monedas de $100 representan…','$2.300',['$2.030','$3.200','$2.130'],'2.000 + 300 = 2.300.','OA7'),
 N('Entre una mochila de $890 y una de $970, ¿cuál es la diferencia de precio?','$80',['$70','$90','$180'],'970 − 890 = 80.','OA7'),
 N('Alicia tenía $950, recibió $200 y gastó $480. ¿Cuánto tiene?','$670',['$570','$770','$680'],'950 + 200 − 480 = 670.','OA7'),
 N('Se compraron 6 lápices por $720 en total. ¿Cuánto costó cada lápiz?','$120',['$100','$140','$160'],'720 ÷ 6 = 120.','OA7'),
])
# UNIDAD 3 — representación y resolución con fracciones.
L(3,4,'Fracciones en objetos y grupos','OA8',
 ('De 8 gajos iguales, 3 están marcados.', 'La fracción es 3/8: tres partes de ocho.'),
 ('Una colección de 12 cartas tiene 6 rojas.', '6 de 12 se expresan como 6/12 o 1/2.'),[
 N('Un círculo está dividido en 6 partes iguales; 2 están pintadas. ¿Qué fracción está pintada?','2/6',['6/2','2/5','1/6'],'Dos partes seleccionadas entre seis iguales.','OA8','visual'),
 N('En una bandeja hay 10 frutas y 4 son peras. ¿Qué fracción de las frutas son peras?','4/10',['10/4','6/10','4/6'],'Cuatro elementos de diez.','OA8'),
 N('Una cinta se divide en 8 segmentos iguales; 5 llevan un círculo. ¿Qué fracción representa los marcados?','5/8',['3/8','8/5','5/6'],'Numerador: marcados; denominador: segmentos.','OA8','visual'),
 N('Una receta necesita 1/4 de taza de agua. ¿Qué significa el 4?','cuatro partes iguales del total',['cuatro tazas completas','cuatro ingredientes','cuatro cucharadas extras'],'El denominador cuenta las partes iguales del todo.','OA8','verbal'),
 N('En una caja con 12 lápices, 3 son verdes. ¿Qué fracción expresa los lápices verdes?','3/12',['3/9','12/3','9/12'],'3 de 12 lápices.','OA8'),
 N('En una recta de 0 a 1 dividida en 5 partes iguales, el tercer punto indica…','3/5',['5/3','2/5','3/4'],'Se cuentan tres quintos desde cero.','OA8','visual'),
 N('Una pizza tiene 8 rebanadas iguales y quedan 3. ¿Qué fracción de pizza queda?','3/8',['5/8','8/3','3/5'],'Tres octavos permanecen.','OA8'),
 N('¿Cuál es una situación que representa 1/2?','pintar 3 de 6 casillas iguales',['pintar 2 de 5','pintar 1 de 3','pintar 3 de 8'],'3/6 es igual a la mitad.','OA8','visual'),
 N('De 20 canicas, 5 son amarillas. ¿Cuál representa esa parte del grupo?','5/20',['20/5','15/20','5/15'],'5 de 20 canicas.','OA8'),
 N('Una bandera tiene 3 franjas iguales y solo una es azul. ¿Qué fracción es azul?','1/3',['3/1','2/3','1/2'],'Una franja de tres.','OA8','visual'),
])
L(3,5,'Orden y equivalencias visibles','OA8',
 ('Entre 1/4 y 1/2, ¿qué parte es mayor?', 'La mitad cubre más superficie que un cuarto.'),
 ('Dos tiras iguales se dividen en 8 y en 4 partes.', '2/4 coincide con 4/8 al superponerlas.'),[
 N('De dos barras iguales, una tiene 3/8 coloreados y otra 5/8. ¿Cuál tiene más?','5/8',['3/8'],'Con igual denominador gana el mayor numerador.','OA8','visual'),
 N('Si una barra tiene 2/4 pintados, ¿qué fracción equivale a la misma cantidad?','1/2',['1/4','3/4','1/3'],'Dos cuartos son una mitad.','OA8'),
 N('Una recta marca 1/5, 2/5, 3/5 y 4/5. ¿Cuál punto está más cerca de 1?','4/5',['1/5','2/5','3/5'],'4/5 deja solo una quinta parte hasta 1.','OA8','visual'),
 N('Lucía consumió 1/3 de su chocolate y Leo 1/6 de otro igual. ¿Quién consumió más?','Lucía',['Leo'],'Un tercio es mayor que un sexto.','OA8'),
 N('Una figura muestra 6 de 12 cuadros sombreados. ¿Qué fracción simplificada representa?','1/2',['1/3','1/4','2/3'],'Seis de doce equivalen a la mitad.','OA8','visual'),
 N('¿Qué fracción es mayor: 3/10 o 7/10?','7/10',['3/10'],'Al dividir el mismo todo en diez partes, siete es más que tres.','OA8'),
 N('Un recipiente contiene 1/4 de litro y otro 1/2. ¿Qué recipiente contiene menos?','el de 1/4',['el de 1/2'],'Un cuarto es menor que un medio.','OA8'),
 N('En un mosaico, 2/8 de las piezas son rojas. ¿Qué porcentaje del mosaico representa aproximadamente?','25%',['50%','75%','10%'],'2/8 = 1/4 = 25%.','OA8'),
 N('Ordena las fracciones 1/8, 4/8 y 6/8 de menor a mayor.','1/8, 4/8, 6/8',['6/8, 4/8, 1/8','4/8, 1/8, 6/8','1/8, 6/8, 4/8'],'Mismo denominador: ordenar numeradores.','OA8'),
 N('En dos caminos de igual longitud, se recorren 4/6 y 2/6. ¿Cuál distancia es menor?','2/6',['4/6'],'Dos sextos es menos que cuatro sextos.','OA8'),
])
L(3,6,'Sumar y restar partes del mismo todo','OA9',
 ('Si pintas 2/8 y luego 3/8 de una misma figura, sumas…', '2/8 + 3/8 = 5/8. El denominador no cambia.'),
 ('De 7/10 de una cinta se retiran 2/10.', '7/10 − 2/10 = 5/10.'),[
 N('Una maqueta usa 2/6 de cartón rojo y 3/6 azul. ¿Qué fracción se ocupó?','5/6',['5/12','1/6','6/5'],'Suma de sextos: 2+3 = 5.','OA9'),
 N('Un sendero tiene 9/12 señalizados. Se borran 4/12. ¿Qué fracción sigue señalizada?','5/12',['5/24','13/12','4/12'],'9/12 − 4/12 = 5/12.','OA9'),
 N('En una jarra se vierten 1/4 y luego 2/4 de litro. ¿Cuánto se añadió en total?','3/4 L',['3/8 L','1/2 L','2/4 L'],'Las partes son cuartos: 1 + 2 = 3.','OA9'),
 N('Se usaron 7/10 de una madeja de lana y se recuperaron 3/10. ¿Qué fracción sigue utilizada?','4/10',['10/10','4/20','3/10'],'7/10 − 3/10 = 4/10.','OA9'),
 N('¿Qué operación representa juntar 2/5 de una tira con otros 2/5?','2/5 + 2/5 = 4/5',['2/5 + 2/5 = 4/10','2/5 + 2/5 = 2/10','2/5 + 2/5 = 0'],'Se conserva el denominador común.','OA9','verbal'),
 N('Un álbum tenía 8/8 de páginas libres y se ocupan 5/8. ¿Qué parte queda libre?','3/8',['3/16','5/8','8/3'],'8/8 − 5/8 = 3/8.','OA9'),
 N('En una carrera alguien corre 3/12 del trayecto, descansa y corre 4/12 más. ¿Qué parte recorrió?','7/12',['7/24','1/12','12/7'],'3/12 + 4/12 = 7/12.','OA9'),
 N('Se pinta 4/8 de una pared y luego 1/8 adicional. ¿Qué fracción quedó pintada?','5/8',['4/16','3/8','1/2'],'4/8 + 1/8 = 5/8.','OA9'),
 N('Una receta tenía 6/6 de harina y se utilizaron 2/6. ¿Qué fracción queda disponible?','4/6',['4/12','2/6','6/4'],'6/6 − 2/6 = 4/6.','OA9'),
 N('Si de 11/12 de una figura sombreada borras 5/12, queda…','6/12',['6/24','5/12','16/12'],'11/12 − 5/12 = 6/12.','OA9'),
])
# UNIDAD 4 — tablas, ecuaciones, desigualdades.
L(4,4,'Descubrir reglas en tablas','OA13',
 ('En la lista 3, 7, 11, 15, cada número aumenta 4.', 'La regla es sumar 4. Sigue 19.'),
 ('Una tabla tiene entrada 2→6, 3→9.', 'Multiplicar por tres transforma la entrada en la salida.'),[
 N('Una escalera usa los números 14, 19, 24, 29. ¿Qué número iría después?','34',['30','33','39'],'Se suma 5 cada vez.','OA13'),
 N('En una tabla: 2→8, 3→12, 5→20. ¿Qué salida corresponde a 6?','24',['22','18','30'],'La regla es multiplicar por 4.','OA13'),
 N('Una máquina aplica “restar 7”. Si entra 32, ¿qué número sale?','25',['39','24','27'],'32 − 7 = 25.','OA13'),
 N('La lista 4, 8, 12, 17, 20 tiene un error si la regla es sumar 4. ¿Qué número está mal?','17',['4','12','20'],'Debería aparecer 16.','OA13'),
 N('En una hoja la secuencia es 90, 80, 70, __, 50. ¿Qué falta?','60',['65','40','75'],'Disminuye 10 por paso.','OA13'),
 N('Cada cuadrado añade 3 fósforos: figura 1 = 4, figura 2 = 7. ¿Cuántos fósforos tendrá la figura 4?','13',['10','14','16'],'4, 7, 10, 13.','OA13','visual'),
 N('Una tabla multiplica por 5 el número de bolsas. Si hay 7 bolsas, ¿cuántas frutas hay?','35',['30','40','12'],'7 × 5 = 35.','OA13'),
 N('Observa 5, 10, 20, 40. ¿Qué regla explica el patrón?','multiplicar por 2',['sumar 5','restar 2','multiplicar por 5'],'Cada término es el doble.','OA13','verbal'),
 N('Una secuencia empieza en 48 y resta 6 cada vez. ¿Cuál es su cuarto término?','30',['36','24','42'],'48, 42, 36, 30.','OA13'),
 N('En una tabla: día 1 = 3 plantas, día 2 = 6, día 3 = 9. Manteniendo la regla, ¿cuántas en día 6?','18',['15','21','12'],'Tres plantas por día.','OA13'),
])
L(4,5,'La incógnita en historias','OA14',
 ('La caja contiene x lápices; con 5 más hay 12.', 'x + 5 = 12, por tanto x = 7.'),
 ('En una balanza, x − 3 = 8.', 'Sumar 3 a ambos lados da x = 11.'),[
 N('La suma de una cantidad desconocida y 9 es 24. ¿Cuánto vale la cantidad?','15',['13','16','33'],'x + 9 = 24; x = 24 − 9.','OA14'),
 N('Una mochila con 18 objetos pierde x y quedan 11. ¿Cuánto se retiró?','7',['6','8','29'],'18 − x = 11; x = 7.','OA14'),
 N('¿Cuál ecuación describe “un número aumentado en 12 es 30”?','x + 12 = 30',['x − 12 = 30','x + 30 = 12','12 − x = 30'],'Aumentado en 12 significa sumar 12.','OA14','verbal'),
 N('En una balanza, una caja x y cuatro pesas suman 19. ¿Cuánto pesa la caja?','15',['13','16','23'],'x + 4 = 19; x = 15.','OA14','visual'),
 N('Un bus tenía x personas; bajaron 8 y quedaron 17. ¿Cuántas había al inicio?','25',['9','24','26'],'x − 8 = 17; x = 25.','OA14'),
 N('Verifica cuál número cumple la ecuación x + 13 = 40.','27',['26','28','53'],'27 + 13 = 40.','OA14'),
 N('El perímetro no se usa: en una bolsa hay x botones y se agregan 6 hasta tener 21. ¿Qué ecuación representa?','x + 6 = 21',['x − 6 = 21','x + 21 = 6','6 − x = 21'],'Se agregan seis al valor inicial.','OA14','verbal'),
 N('Un número menos 14 es 35. ¿Cuál es ese número?','49',['21','45','51'],'x − 14 = 35; x = 49.','OA14'),
 N('En una tabla x + 7 = 32. ¿Qué operación inversa permite hallar x?','32 − 7',['32 + 7','32 × 7','7 − 32'],'La resta deshace una suma.','OA14','verbal'),
 N('Se compraron x tarjetas, se entregaron 15 y quedaron 42. ¿Cuántas se compraron?','57',['27','47','67'],'x − 15 = 42; x = 57.','OA14'),
])
L(4,6,'Comparar cantidades con desigualdades','OA14',
 ('Si x + 2 < 7, entonces x puede ser 1, 2, 3 o 4.', 'Se resta 2 en ambos lados: x < 5.'),
 ('Para entrar a una sala caben como máximo 20 personas.', 'Si hay x adentro, x ≤ 20 representa el máximo.'),[
 N('Una caja admite menos de 10 kg. Si ya tiene 6 kg, ¿cuántos kg adicionales enteros puede recibir como máximo?','3',['4','5','6'],'6 + x < 10, entonces x puede ser hasta 3.','OA14'),
 N('¿Qué número verifica la inecuación x + 4 < 12?','7',['8','9','12'],'7 + 4 = 11, menor que 12.','OA14'),
 N('Una fila debe tener más de 15 y menos de 19 estudiantes. ¿Qué cantidad cumple ambas condiciones?','17',['14','20','19'],'15 < 17 < 19.','OA14'),
 N('Un ascensor admite hasta 8 personas. Si hay x personas, ¿qué condición expresa el límite?','x ≤ 8',['x > 8','x = 9','x ≥ 9'],'El máximo permite ocho o menos.','OA14','verbal'),
 N('En el plato A hay 2 + x fichas y en el B 9. ¿Qué x hace que A tenga menos fichas?','6',['7','8','9'],'2 + 6 = 8 < 9.','OA14','visual'),
 N('Se necesitan al menos 12 puntos para recibir una estrella. ¿Qué puntaje satisface la regla?','12',['10','11','9'],'Al menos incluye el número 12.','OA14'),
 N('La expresión 4 + x > 10 requiere que x sea…','mayor que 6',['igual a 6','menor que 6','igual a 2'],'Restando 4 resulta x > 6.','OA14','verbal'),
 N('Si 18 − x < 13, ¿cuál valor hace verdadera la desigualdad?','6',['3','4','5'],'18 − 6 = 12, que es menor que 13.','OA14'),
 N('Una cinta debe medir menos de 30 cm. Si ya mide 22 cm, ¿qué extensión entera permite seguir bajo 30?','7 cm',['8 cm','9 cm','10 cm'],'22 + 7 = 29 < 30.','OA14'),
 N('En una carrera se clasifica con tiempo igual o menor a 25 minutos. ¿Qué tiempo clasifica?','24 min',['26 min','27 min','30 min'],'24 es menor que 25, así que cumple el límite.','OA14'),
])
# UNIDAD 5 — visualización, longitudes, áreas y datos.
L(5,6,'Mover figuras y reconocer simetrías','OA17',
 ('Dobla un cuadrado por la mitad vertical.', 'Las dos partes coinciden: esa recta es un eje de simetría.'),
 ('Una flecha mira al norte y gira 180°.', 'Queda apuntando al sur: es media vuelta.'),[
 N('Una mariposa tiene alas iguales a ambos lados de su cuerpo. ¿Qué concepto ilustra?','simetría',['área','división','fracción'],'Una línea central divide dos mitades que coinciden.','OA17','visual'),
 N('Una flecha apunta a la derecha → y gira 180°. ¿Hacia dónde apunta después?','hacia la izquierda',['hacia arriba','hacia abajo','hacia la derecha'],'Un giro de 180° invierte la orientación.','OA18','visual'),
 N('Una figura se desliza 4 espacios a la derecha sin girar. ¿Qué transformación ocurrió?','traslación',['reflexión','rotación','división'],'Se desplaza sin cambiar de orientación.','OA18','visual'),
 N('Al reflejar la letra A mayúscula sobre una línea vertical por su centro, ¿qué sucede?','sus mitades coinciden',['queda rotada 180°','aumenta de tamaño','se divide en tres'],'La A mayúscula convencional posee simetría vertical.','OA17'),
 N('Un triángulo se ve reflejado como en un espejo. ¿Qué propiedad cambia?','la orientación izquierda-derecha',['su número de vértices','su área','su número de lados'],'Reflexión invierte la orientación respecto del eje.','OA18','visual'),
 N('¿Cuántas líneas de simetría tiene un rectángulo no cuadrado?','2',['1','3','4'],'Una horizontal y una vertical.','OA17'),
 N('Una rueda gira media vuelta. ¿A cuántos grados corresponde?','180°',['90°','45°','360°'],'Media vuelta es 180°.','OA18'),
 N('Un dibujo tiene su mitad izquierda y derecha exactamente iguales. ¿Dónde está su eje de simetría?','en el centro, vertical',['en el borde inferior','fuera del dibujo','en un vértice'],'La recta vertical central refleja ambos lados.','OA17','visual'),
 N('Una hoja se mueve hacia abajo manteniendo su posición de frente. ¿Qué transformación es?','traslación',['giro de 180°','reflexión','simetría axial'],'Se traslada de un lugar a otro.','OA18'),
 N('Un cuadrado tiene cuatro líneas que lo dividen en mitades reflejadas. ¿Cuál cantidad es correcta?','4',['1','2','3'],'Dos medianas y dos diagonales son ejes de simetría.','OA17'),
])
L(5,7,'Medir para construir','OA22',
 ('Una cuerda mide 3 m. ¿Cuántos cm son?', '3 × 100 = 300 cm; 1 m = 100 cm.'),
 ('Una baldosa rectangular tiene lados de 4 cm y 3 cm.', 'Su área es 4 × 3 = 12 cm².'),[
 N('Una cinta de 5 metros se expresa en centímetros como…','500 cm',['50 cm','5 cm','5.000 cm'],'5 × 100 = 500.','OA22'),
 N('El ancho de una mesa es 80 cm. ¿Cuántos centímetros faltan para completar 1 m?','20 cm',['10 cm','30 cm','80 cm'],'100 − 80 = 20.','OA22'),
 N('Un huerto rectangular mide 7 m de largo y 4 m de ancho. ¿Cuál es su área?','28 m²',['22 m²','11 m²','14 m²'],'Área = largo × ancho = 7 × 4.','OA23'),
 N('Una plaza cuadrada tiene 6 m de lado. ¿Cuántos m² ocupa?','36 m²',['24 m²','12 m²','18 m²'],'6 × 6 = 36.','OA23'),
 N('Una regla de 30 cm y otra de 45 cm se ponen en línea. ¿Qué longitud total tienen?','75 cm',['65 cm','85 cm','15 cm'],'30 + 45 = 75.','OA22'),
 N('Una pared de 12 m² mide 3 m de alto. ¿Cuánto mide de ancho si es rectangular?','4 m',['6 m','9 m','36 m'],'12 ÷ 3 = 4.','OA23'),
 N('¿Qué unidad usarías para medir el largo de un pasillo escolar?','metros',['kilogramos','litros','grados'],'El metro mide longitudes grandes.','OA22','verbal'),
 N('Un cartel rectangular tiene 24 cm² de área y 8 cm de ancho. ¿Qué alto tiene?','3 cm',['4 cm','16 cm','32 cm'],'24 ÷ 8 = 3.','OA23'),
 N('Un trozo de cordón mide 250 cm. ¿Qué expresión equivalente es correcta?','2 m y 50 cm',['25 m','2 m y 5 cm','20 m y 50 cm'],'200 cm son 2 m; sobran 50 cm.','OA22'),
 N('Dos rectángulos miden 2 × 6 y 3 × 4 cm. ¿Qué tienen en común?','la misma área',['el mismo alto','el mismo ancho','perímetros iguales'],'Ambos ocupan 12 cm².','OA23','visual'),
])
L(5,8,'Leer gráficos y tomar decisiones','OA27',
 ('Una tabla dice: lunes 3, martes 5, miércoles 2 libros.', 'El martes tuvo más libros leídos.'),
 ('En un pictograma una ★ representa 2 votos.', 'Cuatro estrellas representan 4 × 2 = 8 votos.'),[
 N('En la encuesta: manzana 8, pera 5, plátano 6 votos. ¿Cuál fruta fue preferida?','manzana',['pera','plátano','empate'],'La mayor frecuencia es 8.','OA27'),
 N('En un pictograma cada ● representa 3 bicicletas. Una fila tiene ●●●●. ¿Cuántas bicicletas son?','12',['4','7','16'],'Cuatro símbolos por tres bicicletas.','OA27','visual'),
 N('Un gráfico de barras registra 12 estudiantes en ajedrez y 9 en pintura. ¿Cuál es la diferencia?','3',['2','4','21'],'12 − 9 = 3.','OA27'),
 N('Una tabla anota lluvia en días: lunes 4, martes 0, miércoles 7 mm. ¿Qué día llovió más?','miércoles',['lunes','martes','todos igual'],'7 mm es el máximo.','OA27'),
 N('Los votos fueron: rojo 6, azul 10, verde 4. ¿Cuántos votos hubo en total?','20',['16','18','24'],'6 + 10 + 4 = 20.','OA27'),
 N('Cada dibujo de pez vale 5 peces. En la columna hay 3 dibujos. ¿Cuál es la lectura correcta?','15 peces',['3 peces','8 peces','20 peces'],'Escala: tres pictogramas por cinco.','OA27','visual'),
 N('Un gráfico muestra 7 personas que usan bus y 14 que caminan. ¿Qué conclusión está respaldada?','el doble camina',['más personas usan bus','nadie camina','la mitad camina'],'14 es el doble de 7.','OA27','verbal'),
 N('En la tabla de reciclaje: papel 18 kg, vidrio 12 kg, plástico 9 kg. ¿Cuánto suman papel y vidrio?','30 kg',['21 kg','39 kg','27 kg'],'18 + 12 = 30.','OA27'),
 N('Las barras de una encuesta miden 4, 7, 7 y 2. ¿Qué afirmación es correcta?','dos categorías empatan en 7',['la última tiene más','todas tienen 7','ninguna empata'],'La segunda y la tercera tienen igual altura.','OA27','visual'),
 N('Un pictograma usa 2 símbolos para lunes y 5 para viernes, con 4 libros por símbolo. ¿Cuántos libros más representa viernes?','12',['3','7','20'],'(5 − 2) × 4 = 12.','OA27','visual'),
])
assert len(LESSONS)==15
qas=[]
for lesson in LESSONS:
 for ix,(q,ans,wrong,ex,oa,skill) in enumerate(lesson['preguntas'],1):
  assert len(wrong) in (1,3),(lesson['titulo'],ix)
  assert ans not in wrong and len(set(wrong))==len(wrong),(lesson['titulo'],ix)
  assert len(q)>24 and len(ex)>10,(lesson["titulo"],ix,q,ex)
  entry=dict(codigo=f"V14-U{lesson['u']}C{lesson['c']}Q{ix}",unidad=lesson['u'],conjunto=f"U{lesson['u']}-C{lesson['c']:02d}",orden=ix,
    enunciado=q,respuesta=ans,incorrectas=wrong,explicacion=ex,oa=oa,estrategia=skill)
  qas.append(entry)
assert len(qas)==150
assert len(set(q['enunciado'].lower() for q in qas))==150
assert Counter(q['unidad'] for q in qas)=={i:30 for i in range(1,6)}

def esc(x):return str(x).replace("'","''")
def sqltxt(x):return "'"+esc(x)+"'"
seed=['-- Rumbo SIMCE v14: +15 lecciones / +150 ejercicios con contextos y procesos diversos.',
      '-- ID estable en codigo; no modifica pruebas de unidad, ensayo final ni diagnósticos previos.',
      '-- Es idempotente: puede ejecutarse con npm run db:seed más de una vez.',
      '-- Los intentos historicos mantienen sus IDs y sus respuestas.']
for l in LESSONS:
 unit=l['u'];number=l['c'];code=f'U{unit}-C{number:02d}'
 seed.append(f"INSERT INTO conjunto(codigo,nivel_id,orden,titulo,objetivo_aprendizaje,tiempo_estandar_seg,activo) VALUES ({sqltxt(code)},(SELECT id FROM nivel WHERE codigo='SIMCE-U{unit}'),{number},{sqltxt(l['titulo'])},{sqltxt(l['oa']+': '+l['titulo'])},900,TRUE) ON CONFLICT(codigo) DO UPDATE SET titulo=EXCLUDED.titulo,objetivo_aprendizaje=EXCLUDED.objetivo_aprendizaje,activo=TRUE;")
 for hoja in (1,2):
  ej=l['ejemplos'][hoja-1]
  seed.append(f"INSERT INTO hoja(conjunto_id,orden,ejemplo_enunciado,ejemplo_resolucion) VALUES ((SELECT id FROM conjunto WHERE codigo={sqltxt(code)}),{hoja},{sqltxt(ej[0])},{sqltxt(ej[1])}) ON CONFLICT(conjunto_id,orden) DO UPDATE SET ejemplo_enunciado=EXCLUDED.ejemplo_enunciado,ejemplo_resolucion=EXCLUDED.ejemplo_resolucion;")
 for q in [q for q in qas if q['conjunto']==code]:
  rng=random.Random(q['codigo']);values=[q['respuesta'],*q['incorrectas']];rng.shuffle(values)
  opts=[dict(clave=chr(65+i),texto=str(v),tipo_error=None) for i,v in enumerate(values)]
  resp=next(o['clave'] for o in opts if o['texto']==q['respuesta'])
  eje={1:'numeros',2:'numeros',3:'numeros',4:'patrones',5:'geometria'}[unit]
  # All questions have their own permanent V14 code; no replacements of old evaluation questions.
  seed.append(f"INSERT INTO pregunta(codigo,eje_id,enunciado,opciones,respuesta_correcta,dificultad,estrategia,explicacion,activa,oa_codigo,revisada_pedagogicamente) VALUES ({sqltxt(q['codigo'])},(SELECT id FROM eje WHERE codigo={sqltxt(eje)}),{sqltxt(q['enunciado'])},{sqltxt(json.dumps(opts,ensure_ascii=False))}::jsonb,{sqltxt(resp)},3,{sqltxt(q['estrategia'])},{sqltxt(q['explicacion'])},TRUE,{sqltxt(q['oa'])},FALSE) ON CONFLICT(codigo) DO UPDATE SET enunciado=EXCLUDED.enunciado,opciones=EXCLUDED.opciones,respuesta_correcta=EXCLUDED.respuesta_correcta,explicacion=EXCLUDED.explicacion,activa=TRUE;")
  hoja=1 if q['orden']<=5 else 2;orden=q['orden'] if hoja==1 else q['orden']-5
  seed.append(f"INSERT INTO hoja_ejercicio(hoja_id,pregunta_id,orden) VALUES ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id=h.conjunto_id WHERE c.codigo={sqltxt(code)} AND h.orden={hoja}),(SELECT id FROM pregunta WHERE codigo={sqltxt(q['codigo'])}),{orden}) ON CONFLICT DO NOTHING;")
# Reconcile students already at the old final lesson and awaiting a test without submitted evaluation:
# They must complete the expanded practice before newly taking the final unit exam.
# Do not touch students with already-submitted exam attempts or with teacher approvals.
seed.append('''-- Al ampliar una unidad: si se estaba a punto de cerrar la última hoja antigua, la nueva práctica se incorpora.
-- No cambia pruebas ya entregadas, autorizaciones, diagnósticos ni progreso histórico.
UPDATE estudiante_posicion p
SET conjunto_id=neu.id,cierre_nivel_pendiente=FALSE,actualizado_en=now()
FROM conjunto viejo JOIN conjunto neu ON neu.nivel_id=viejo.nivel_id
JOIN nivel n ON n.id=viejo.nivel_id
WHERE p.conjunto_id=viejo.id AND p.cierre_nivel_pendiente=TRUE
  AND ((n.codigo IN ('SIMCE-U1','SIMCE-U2','SIMCE-U3','SIMCE-U4') AND viejo.orden=3 AND neu.orden=4)
    OR (n.codigo='SIMCE-U5' AND viejo.orden=5 AND neu.orden=6))
  AND NOT EXISTS (SELECT 1 FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
     WHERE i.estudiante_id=p.estudiante_id AND e.nivel_id=viejo.nivel_id AND i.entregado_en IS NOT NULL);
''')
out=ROOT/'seeds'/'008_ampliacion_practicas_v14.sql';out.write_text('\n'.join(seed)+'\n',encoding='utf8')
(ROOT/'scripts'/'banco-practica-v14.json').write_text(json.dumps({'lecciones':LESSONS,'preguntas':qas},ensure_ascii=False,indent=2),encoding='utf8')
print('CREATED',len(LESSONS),'lecciones',len(qas),'preguntas',round(out.stat().st_size/1024),'KiB',Counter(q['oa'] for q in qas))
