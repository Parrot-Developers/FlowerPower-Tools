let API = require('./index');

let me = new API('parrottest.fpwebservice@gmail.com', 'cvSjfnONllkHLymF2gEUL73PPXJiMMcVCd1VtZaIXHSGyhaT');

me.login('parrottest.fpwebservice@gmail.com', 'Parrot2015FP').then((err) => {
	return me.getGarden();
}).then((garden) => {
	console.log(garden.sensors);
});
