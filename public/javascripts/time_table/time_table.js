$(document).ready(function(){
	$("#search_button").click(function(){
		var data = {};
		
		data['dept_station'] = $("#dept_station").val();
		data['arrv_station'] = $("#arrv_station").val();

		alert(data);
		
		$.ajax({
			type : 'POST',
			dataType : 'json',
			url : '/show_time_table/station',
			data : data,
			success : function( result ) {
				alert('success');
				console.log(result);
			},
			error : function( request, status, error ) {
				alert('req : ', request, '  status : ', status, '  error : ', error);
			}
		});//end of ajax
	});
});