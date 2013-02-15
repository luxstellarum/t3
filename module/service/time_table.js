var time_table_db = require('../provider/time_table');

var jsdom = require('jsdom'),
	Iconv = require('iconv').Iconv,
	iconv = new Iconv('EUC-KR', 'UTF-8//TRANSLIT//IGNORE'),
	strlib = require('../library/strlib.js');

var exist = 0;

module.exports = {
	insert : function(data, callback) {
		time_table_db.add(data, function(result){
			callback(result);
		});
	} // end of insert	

	,set_time_table : function(train_number) {
		var self = this;
		var last = 2001;
		
		console.log('train_number : ', train_number);

		if( train_number < last) {
			self.set_uri(train_number, function(uri) {
				var train_info = {};

				jsdom.env({
					html : uri,
					scripts : ['https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js'],
					encoding : 'binary',
					done : function(err, window){
						if(!err) {
							var $ = window.$;
							/***********차량 번호 따내기************/
							train_info['id'] = train_number;
							/***********************************/

							/***********차종 따내기****************/

							var tmp = "";
							tmp = strlib.trim($('thead tr:first').find('td').text());
							var buf = new Buffer(tmp.length);
							buf.write(tmp, 0, tmp.length, 'binary');
							tmp = iconv.convert(buf).toString();

							var split_str = tmp.split('[');
							
							tmp = strlib.trim(split_str[1]);
							split_str = tmp.split(']');

							train_info['type'] = strlib.trim(split_str[0]);
							/***********************************/
							
							var length = $('tr[bgcolor="#FFFFFF"]').length;
							var count = 0;
							/************출발시각 및 도착시각 따내기********************/
							if(length == 0) {
								self.set_time_table(train_number+1);
							}
							else {
								$('tr[bgcolor="#FFFFFF"]').each(function(){
									self.make_train_contents(this, $, function(result){
										train_info['dept_station'] = result.dept_station;
										train_info['arrv_station'] = result.arrv_station;
										train_info['dept_time'] = result.dept_time;
										train_info['arrv_time'] = result.arrv_time;
										self.insert(train_info, function(result) {
											if(result.result == true) {
												(function(n){
													if( n != (length-1) ) {
														count++;
													}
													else {
														self.set_time_table(train_number+1);						
													}
												})(count);
											}
										});
									})
								});	
							}
							/****************************************************/
						}
						else {
							self.set_time_table(train_number+1);
						}
					}//end of done function
				});//end of jsdon.env
			});//end of set_uri
		}//end of if
		else {
			console.log('end of set time table');
		}		
	}

	,set_uri : function(train_number, callback) {
		var self = this;
		var uri_form = "http://www.korail.com/servlets/pr.pr11100.sw_pr11131_i1Svt?txtRunDt=20121107&txtTrnNo=";
		var uri;

		if(train_number < 10) {
			uri = uri_form + "0000" + train_number;
		}
		else if (train_number < 100) {
			uri = uri_form + "000" + train_number;	
		}
		else if (train_number < 1000) {
			uri = uri_form + "00" + train_number;	
		}
		else if (train_number < 10000) {
			uri = uri_form + "0" + train_number;	
		}
		callback(uri);
	}


	,make_train_contents : function(target, $, callback) {
		var tmp = '',
			buf,
			result = {};

		//출발역
		tmp = strlib.trim($(target).find('td:first').text());
		if(tmp!="") {
			buf = new Buffer(tmp.length);
			buf.write(tmp, 0, tmp.length, 'binary');
			result['dept_station'] = iconv.convert(buf).toString();

			tmp = strlib.trim($(target).find('td:first').parent().next().find('td:first').text());
			
			if(tmp!="") {
				buf = new Buffer(tmp.length);
				buf.write(tmp, 0, tmp.length, 'binary');
				result['arrv_station'] = iconv.convert(buf).toString();
				result['dept_time'] = strlib.trim($(target).find('td:first').next().next().text());
				result['arrv_time'] = strlib.trim($(target).find('td:first').parent().next().find('td:first').next().text());
			}
			else {
				result['arrv_station'] = "";
				result['arrv_time'] = "";
				result['dept_time'] = "";
			}
		}
		else {
			result['dept_station'] = "";	
		}

		callback(result);
	}
}