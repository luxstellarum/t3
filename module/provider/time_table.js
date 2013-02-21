var mongoose = require('mongoose');
var schema = mongoose.Schema;

var time_table_schema =  new schema({
	id : String, //기차번호
	type : String, //차종
	url : String, //정보 가져온 url
	dept_station : String, //출발역
	arrv_station : String, //도착역
	dept_time : String, //출발시간
	arrv_time : String, //도착시간
	update_date : Date //업데이트한 날짜
});

var model = mongoose.model('time_table', time_table_schema);

module.exports = {
	add : function( train, callback) {
		var doc = new model();
		var response = {};

		//insert
		doc.id = train.id;
		doc.type = train.type;
		doc.url = train.url;
		doc.dept_station = train.dept_station;
		doc.arrv_station = train.arrv_station;
		doc.dept_time = train.dept_time;
		doc.arrv_time = train.arrv_time;
		doc.update_date = new Date();

		doc.save(function(err) {
			if(!err) {
				response['result'] = true;
			}
			else {
				response['result'] = false;
			}
			callback(response); // 잠정적 문제코드. (순서역전 가능성)
		});

	} // end of add

	,get_one : function( condition, callback ) {
		var response = {};
		model.findOne(condition, function(err, doc) {
			if(!err && doc) {
				response['result'] = true;
				response['data'] = new Array();
				response['data'] = doc;

				callback(response);
			}
			else {
				response['result'] = false;
				callback(response);
			}

		});
	} // end of get_one

	,get_list : function( condition, order_target, callback) {
		var response = {};
		
		order_target = order_target || 'dept_time';

		model.find(condition).sort(order_target).exec(function(err, docs) {
			if(!err && docs) {
				response['result'] = true;
				response['data'] = new Array(); 
				response['data'] = docs;
				callback(response);
			}
			else {
				response['result'] = false;
				callback(response);
			}

			
		});
	}
}