var time_table_db = require('../provider/time_table'),
	station_db = require('../provider/station');

var jsdom = require('jsdom'),
	Iconv = require('iconv').Iconv,
	iconv = new Iconv('EUC-KR', 'UTF-8//TRANSLIT//IGNORE'),
	strlib = require('../library/strlib.js');

var transfer_station = new Array('경주','영천','서경주','영주','제천','민둥산','동백산','동해','봉양','천안','천안아산','오송','조치원','대전',
								'김천','동대구','삼랑진','창원','순천','광주송정','익산');


module.exports = {


/******************************* 
	
	철도 시간표 파싱 / 디비 저장

********************************/

	insert : function(data, callback) {
		time_table_db.add(data, function(result){
			callback(result);
		});
	} // end of insert	

	,set_time_table : function(train_number) {
		var self = this;
		var last = 2001;
		
		if( train_number < last) {
			
			console.log('train_number : ', train_number);

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
	}//end of set_time_table

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
	}//end of set_uri


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
	}//end of make_train_contents


/******************************* 

	디비에서 철도 시간표 검색 시작  

********************************/

	,show_time_table_city : function( req, res ) {
		var self = this;
		var dept_city = req.body.dept_city;
		var arrv_city = req.body.arrv_city;
		var time_table = new Array();

		station_db.get_list({'city' : dept_city}, function(dept_stations, dept_err){
			if(!err) {
				station_db.get_list({'city' : arrv_city}, function(arrv_stations, arrv_err){
					if(!err) {
						for( var i=0; i<dept_stations.length; i++) {
							(function(m){
								for( var j=0; j<arrv_stations.length; j++ ) {
									(function(n) {
										//To do
										self.get_time_table_station( dept_stations[m], arrv_stations[n], function(result){
											if( (result != false) && (result.length > 0) ){
												var k = time_table.length;
												time_table[k] = {};
												time_table[k]['dept_station'] = dept_stations[m];
												time_table[k]['arrv_station'] = arrv_stations[n];
												time_table[k]['time_table'] = new Array();
												time_table[k]['time_table'] = result;
											}
										});//end of get_time_table_station
									})(j);//end of funciton(n)
								}//end of for

								if( m == time_table.length-1 ) {
									res.json(time_table);
								}//end of if
							})(i);//end of function(m)
						}//end of for
					}//end of if
				})//end of get_list
			}//end of if
			else {
				res.json({ 'result' : false });
			}
		});// end of get_list
	}//end of show_time_table_city

	,show_time_table_station : function( req, res) {
		var self = this;
		var time_table = {};
		self.get_time_table_station( req.body.dept_station, req.body.arrv_station, function( result ) {

			if( (result != false) && (result.length > 0) ){
				time_table['dept_station'] = req.body.dept_station;
				time_table['arrv_station'] = req.body.arrv_station;
				time_table['time_table'] = new Array();
				time_table['time_table'] = result;	
				res.json( time_table );
			}
			//직통 경로가 없을 때
			else{
				self.get_transfer_time_table( req.body.dept_station, req.body.arrv_station, function( result ) { 
					console.log('result :', result);
					res.json(result);
				});
			}

			
		});//end of get_time_table_station
	}// end of show_time_table_station
	
	,get_time_table_station : function( dept_station, arrv_station, callback ) {
		var self = this;
		var condition = { 'dept_station' : dept_station };
		var order_target = 'dept_time';
		var time_table = new Array();

		time_table_db.get_list(condition, order_target, function(result) {
			if(result.result == true) {
				var list = result.data;

				for( var i=0; i < list.length; i++ ) {
					(function(m){
						condition = { 'id' : list[m].id, 'arrv_station' : arrv_station };
						order_target = '-arrv_time';

						time_table_db.get_one(condition, function(result){
							if( result.result == true) {
								self.compare_time(list[m].dept_time, result.data.arrv_time, function(compare_result) {
									if( compare_result == true) {
										var j = time_table.length
										time_table[j] = {};
										time_table[j]['id'] = list[m].id;
										time_table[j]['dept_time'] = list[m].dept_time;
										time_table[j]['arrv_time'] = result.data.arrv_time;
										time_table[j]['type'] = result.data.type;	
									}									
								});
							}

							if( m == list.length-1 ) {
								callback(time_table);
							}	
						});

					})(i);
				}
			}
			else {
				callback(false);
			}
		});
	}// end of get_time_table_station

	//환승 한 번 ! 인 경우만. 두번 이상도 있으려나?
	,get_transfer_time_table : function( dept_station, arrv_station, callback ) {
		var self = this;
		var time_table = new Array();
		var prev_time_table = new Array();
		var post_time_table = new Array();
		for( var i = 0; i < transfer_station.length; i++) {
			(function(m){
				self.get_time_table_station(dept_station, transfer_station[m], function(prev_result) {
					prev_time_table[m] = {};
					prev_time_table[m]['dept_station'] = dept_station;
					prev_time_table[m]['arrv_station'] = transfer_station[m];
					prev_time_table[m]['time_table'] = new Array();
					prev_time_table[m]['time_table'] = prev_result;

					self.get_time_table_station( transfer_station[m], arrv_station, function(post_result) {
						post_time_table[m] = {};
						post_time_table[m]['dept_station'] = transfer_station[m];
						post_time_table[m]['arrv_station'] = arrv_station;
						post_time_table[m]['time_table'] = new Array();
						post_time_table[m]['time_table'] = post_result;	

						time_table[m] = {};
						time_table[m]['prev'] = new Array();
						time_table[m]['post'] = new Array();
						time_table[m]['prev'] = prev_time_table[m];
						time_table[m]['post'] = post_time_table[m];

						console.log('time table : ', time_table)

						if ( m == transfer_station.length-1 ) {
							console.log('here', time_table);
							callback(time_table);
						}
					});						
				});
			})(i);
		}
	}//end of get_transfer_time_table

	,compare_time : function(time1, time2, callback) {
		var early = time1.split(':');
		var late = time2.split(':');
		if( time1 != "" && time2 != "") {
			if( parseInt(early[0], 10) > parseInt(late[0], 10) ) {
				callback(false);
			}
			else if( parseInt(early[1], 10) > parseInt(late[1], 10) ) {
				callback(false);
			}
			else {
				callback(true);
			}	
		}
	}//end of compare time

}//end of module.exports