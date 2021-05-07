//это я сделал просто по-приколу, типа чтобы корова в терминале говорила, что сервер стартует)
var cowsay = require("cowsay");

console.log(cowsay.say({
	text : "Server launches...",
	e : "oO",
	T : "U "
}));