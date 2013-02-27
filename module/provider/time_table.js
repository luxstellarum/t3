var mongoose = require('mongoose');
var schema = mongoose.Schema;

var time_table_schema =  new schema({
	id : String, //기차번호
	type : String, //차종
	url : String, //정보 가져온 url
	dept_station : String, //출발역
	arrv_station : String, //도착역
	is_transfer : Boolean,
	update_date : Date, //업데이트한 날짜
	/*
		2013. 02. 27 추가
	*/
	dept_hour : Number,
	dept_minute : Number,
	arrv_hour : Number,
	arrv_minute : Number	
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
		doc.is_transfer = train.is_transfer;

		doc.update_date = new Date();
		
		/*
			2013. 02. 27 추가
		*/
		doc.dept_hour = train.dept_hour;
		doc.dept_minute = train.dept_minute;
		doc.arrv_hour = train.arrv_hour;
		doc.arrv_minute = train.arrv_minute;

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

	,get_one : function( condition, hour, minute, callback ) {
		var response = {};
		model.findOne(condition).or([ { dept_hour : {$gte: hour } }, { dept_hour : hour, dept_minute : {$gte : minute} }])
			.sort( 'dept_hour dept_minute' ).exec( function(err, doc) {
		
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

	,get_list : function( condition, order_target, hour, callback) {
		var response = {};
		condition['dept_hour'] = { '$gte' : hour };
		order_target = order_target || 'dept_hour';

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