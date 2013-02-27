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
							
							/************출발시각 및 도착시각 따내기********************/
							if(length == 0) {
								self.set_time_table(train_number+1);
							}
							else {
								//var count = 0;
								for ( var i=0; i<length; i++) {
									(function(n){
										var target = $('table[bgcolor="#CCCCCC"] tbody').find('tr')[n];
										self.make_train_contents(target, $, function(result) {
											self.check_transfer(result.arrv_station, function(is_transfer){
												train_info['dept_station'] = result.dept_station;
												train_info['arrv_station'] = result.arrv_station;
												train_info['dept_hour'] = result.dept_hour;
												train_info['arrv_hour'] = result.arrv_hour;
												train_info['dept_minute'] = result.dept_minute;
												train_info['arrv_minute'] = result.arrv_minute;
												
												train_info['is_transfer'] = is_transfer;

												self.insert(train_info, function(result) {
													if(result.result == true) {
														if( n == length-1 ) {
															console.log('here???');
															self.set_time_table(train_number+1);						
														}
													}
												});	//end of insert
											});//end of check_transfer
										});//end of make_train_contents
									})(i);
								}//end of for
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
				var dept_time = (strlib.trim($(target).find('td:first').next().next().text())).split(':');
				var arrv_time = (strlib.trim($(target).find('td:first').parent().next().find('td:first').next().text())).split(':');

				result['dept_hour'] = dept_time[0];
				result['dept_minute'] = dept_time[1];

				result['arrv_hour'] = arrv_time[0];
				result['arrv_minute'] = arrv_time[1];

			}
			else {
				result['arrv_station'] = "";
				result['dept_hour'] = "";
				result['arrv_hour'] = "";
				result['dept_minute'] = "";
				result['arrv_minute'] = "";

			}
		}
		else {
			result['dept_station'] = "";	
		}

		callback(result);
	}//end of make_train_contents

	,check_transfer : function( target_station, callback ) {
		var flag = 0;
		for ( var i=0; i < transfer_station.length; i++ ) {
			(function(m) {
				if( transfer_station[m] == target_station ) {
					console.log('true', m, target_station);
					flag++;
					callback(true);
				}
				else if ( (transfer_station[m] != target_station) && (m == transfer_station.length-1) && (flag==0) ) {
					console.log('false', m, target_station);
					callback(false);
				}
			})(i);

		}
	} // end of check_transfer


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
										self.get_time_table_station( dept_stations[m], arrv_stations[n], 0, 0, function(result){
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
		self.get_time_table_station( req.body.dept_station, req.body.arrv_station, 0, 0, function( result ) {

			if( (result != false) && (result.length > 0) ){
				time_table['dept_station'] = req.body.dept_station;
				time_table['arrv_station'] = req.body.arrv_station;
				time_table['time_table'] = new Array();
				time_table['time_table'] = result;	
				res.json( time_table );
			}
			//직통 경로가 없을 때
			else{
				self.get_transfer_time_table( req.body.dept_station, req.body.arrv_station, 0, function( result ) {
					console.log( "7) callback?! result : ", result);
					res.json(result);
				});
			}

			
		});//end of get_time_table_station
	}// end of show_time_table_station
	
	,get_time_table_station : function( dept_station, arrv_station, dept_hour, dept_minute, callback ) {
		var self = this;
		var condition = { 'dept_station' : dept_station };
		var order_target = 'dept_hour';
		var time_table = new Array();
		time_table_db.get_list(condition, order_target, dept_hour, function(result) {
			console.log("result.result", result.result, result.data.length);
			if(result.result == true) {
				var list = result.data;

				for( var i=0; i < list.length; i++ ) {
					(function(m){
						condition = { 'id' : list[m].id, 'arrv_station' : arrv_station };

						time_table_db.get_one(condition, dept_hour, dept_minute, function(result){
							if( result.result == true) {
								// To Modify
								self.compare_time(list[m].dept_hour, list[m].dept_minute, result.data.arrv_hour,result.data.arrv_minute , function(compare_result) {
									if( compare_result == true) {
										var j = time_table.length;
										time_table[j] = {};
										time_table[j]['id'] = list[m].id;
										time_table[j]['dept_hour'] = list[m].dept_hour;
										time_table[j]['arrv_hour'] = result.data.arrv_hour;
										time_table[j]['dept_minute'] = list[m].dept_minute;
										time_table[j]['arrv_minute'] = result.data.arrv_minute;
										time_table[j]['type'] = result.data.type;	
									}									
								});
							}

							if( m == list.length-1) {
								console.log( 'callback');
								callback(time_table);
							}	
						});

					})(i);
				}

				if( list.length == 0 ) {
					callback(false);
				}
			}
			else {
				console.log( 'callback2');
				callback(false);
			}
		});
	}// end of get_time_table_station

	//환승 한 번 ! 인 경우만. 두번 이상도 있으려나?
	/*	
		[
			{
				departure {
					station,
					dept_time,
					type,
					id
				}.

				transfer {
					station,
					arrv_time,
					dept_time,
					type,
					id
				},

				arrival {
					station,
					arrv_time
				}
			},
			...
		]
	*/
	,get_transfer_time_table : function( dept_station, arrv_station, dept_hour, callback ) {
	
		var self = this;
		var time_table = new Array();
		var count = 0;
		var condition = {};
		var order_target = 'dept_hour';

		//1. 출발역에서 출발하는 모든 열차의 종류를 획득한다.
		condition = { 'dept_station' : dept_station };
		dept_hour = dept_hour || 0;

		time_table_db.get_list(condition, order_target, dept_hour, function(train) {
			//2. 열차가 존재할 경우 그 열차 내에서 환승역이 존재하는지 검사한다.
			if(train.result == true ) {
				
				function iter1(m) {
					if( m < train.data.length) {
						condition = { 'id' : train.data[m].id, 'is_transfer' : true };
						
						time_table_db.get_list(condition, order_target, train.data[m].arrv_hour, function(transfer){
							//3. 환승역이 존재한다면, 존재하는 환승역 숫자만큼 해당 환승역에서 목적지까지의 직통노선을 조회한다.
							// +) 시간을 비교해서 해당 시간대만 뽑아오는 과정이 필요.
							// ++) 그러려면 디비의 저장되는 방식을 바꿔야한다.
							if(transfer.result == true) {
								
								function iter2(n){
									if( n < transfer.data.length ) {
										self.get_time_table_station( transfer.data[n].arrv_station, 
																	arrv_station, 
																	transfer.data[n].arrv_hour, 
																	transfer.data[n].arrv_minute, 
										function( transfer_train ){
											if( transfer_train.length > 0 ) {
												function iter3(l) {
													console.log("l : ", l);
													if(l < transfer_train.length) {
														var len = time_table.length;
														time_table[len] = {};
														time_table[len]['departure'] = {
															'station'		: dept_station,
															'dept_hour' 	: train.data[m].dept_hour,
															'dept_minute' 	: train.data[m].dept_minute,
															'id'			: train.data[m].id,
															'type'			: train.data[m].type
														};

														time_table[len]['transfer'] = {
															'station'		: transfer.data[n].arrv_station,
															'arrv_hour'		: transfer.data[n].arrv_hour,
															'arrv_minute'	: transfer.data[n].arrv_minute,
															'dept_hour'		: transfer_train[l].dept_hour,
															'dept_minute'	: transfer_train[l].dept_minute,
															'id'			: transfer_train[l].id,
															'type'			: transfer_train[l].type
														};

														time_table[len]['arrival'] = {
															'station'		: arrv_station,
															'arrv_hour'		: transfer_train[l].arrv_hour,
															'arrv_minute'	: transfer_train[l].arrv_minute
														};

														iter3(l+1);
													}//end of if
													else {
														iter2(n+1);
													}
												}//end of iter3
												iter3(0);
	
											}//end of if
											else {
												iter2(n+1);
											}
											
										})//end of get_time_table_station
									} //end of if
									else {
										iter1(m+1);
									}
								}//end of iter2
								iter2(0);

							}//end of if
							else {
								iter1(m+1);
							}
						});//end of get_list
					}//end of if
					else {
						callback(time_table);
					}
				}//end of iter1
				iter1(0);
			}//end of if
			else {
				callback(false);
			}
		});//end of get_list
	}//end of get_transfer_time_table

	,compare_time : function(hour1, minute1, hour2, minute2, callback) {
		if( hour1 != "" && hour2 != "" && minute1 != "" && minute2 != "") {
			if( hour1 > hour2 ) {
				callback(false);
			}
			else if( ( hour1 == hour2 ) &&  ( minute1 > minute2 )  ) {
				callback(false);
			}
			else {
				callback(true);
			}	
		}
	}//end of compare time

}//end of module.exports