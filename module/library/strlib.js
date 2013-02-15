module.exports = {
	trim : function(string) {
		string += ''; // 숫자라도 문자열로 변환
		return string.replace(/^\s*|\s*$/g, '');
	}//end of trim
}