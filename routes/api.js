var time_table = require('../module/service/time_table');

module.exports = function(app){
	app.get('/set_time_table', function(req, res) {
		time_table.set_time_table(3);
	});

	app.post('/show_time_table/station', function(req, res) {
		time_table.show_time_table_station(req, res);
	});
}