
module.exports = function(app) {
	app.get('/', function(req, res) {
		res.render('index');
	});

	app.get('/show_time_table', function(req, res) {
		res.render('time_table/time_table_search');
	});
}


