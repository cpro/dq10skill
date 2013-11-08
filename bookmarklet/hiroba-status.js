(function() {

var SIMULATOR_URL = 'http://cpro.jp/dq10/skillsimulator/';
var HIROBA_STATUS_URL = 'http://hiroba.dqx.jp/sc/home/status/detail/';
if(window.location.href != HIROBA_STATUS_URL) {
	alert('このブックマークレットは\n\n' + HIROBA_STATUS_URL + '\n\nでのみ有効です。');
	return;
}

var VOCATIONS = [
	'戦士',
	'僧侶',
	'魔法使い',
	'武闘家',
	'盗賊',
	'旅芸人',
	'レンジャー',
	'パラディン',
	'魔法戦士',
	'スーパースター',
	'バトルマスター',
	'賢者'
];
var SKILLS = {
	'戦士': ['片手剣', '両手剣', 'オノ', '盾', 'ゆうかん'],
	'僧侶': ['ヤリ', 'スティック', '棍', '盾', 'しんこう心'],
	'魔法使い': ['両手杖', '短剣', 'ムチ', '盾', 'まほう'],
	'武闘家': ['ツメ', '棍', '扇', '格闘', 'きあい'],
	'盗賊': ['短剣', 'ムチ', 'ツメ', '格闘', 'おたから'],
	'旅芸人': ['扇', '棍', '短剣', '盾', 'きょくげい'],
	'バトルマスター': ['両手剣', '片手剣', 'ハンマー', '格闘', 'とうこん'],
	'パラディン': ['ハンマー', 'ヤリ', 'スティック', '盾', 'はくあい'],
	'魔法戦士': ['片手剣', '両手杖', '弓', '盾', 'フォース'],
	'レンジャー': ['弓', 'ブーメラン', 'オノ', '格闘', 'サバイバル'],
	'賢者': ['ブーメラン', '両手杖', '弓', '盾', 'さとり'],
	'スーパースター': ['ムチ', '扇', 'スティック', '格闘', 'オーラ']
}

var HirobaStatus = (function($) {
	var status = {};
	
	function initStatus() {
		for(var i = 0; i < VOCATIONS.length; i++) {
			var vocation = VOCATIONS[i];
			status[vocation] = { skill: {} };
		}
	}
	
	function loadLvExp() {
		var vocation = '';
		$('#jobLvExp tr td[class^=col]').each(function() {
			switch($(this).attr('class')) {
				case 'col1': //職業名
					vocation = $(this).text().trim();
					break;
				case 'col2': //レベル
					status[vocation].level = parseInt($(this).text().trim());
					break;
				case 'col3': //次のレベルまで
					break;
				case 'col4':
					var trainingPt = parseInt($(this).text().trim());
					if(trainingPt >= 1500)
						status[vocation].trainingSkillPt = 5;
					else if(trainingPt >= 1000)
						status[vocation].trainingSkillPt = 4;
					else if(trainingPt >= 600)
						status[vocation].trainingSkillPt = 3;
					else if(trainingPt >= 300)
						status[vocation].trainingSkillPt = 2;
					else if(trainingPt >= 100)
						status[vocation].trainingSkillPt = 1;
					else
						status[vocation].trainingSkillPt = 0;
					break;
			}
		});
	}
	
	function loadSkillPt() {
		for(var skillName in skillMap) {
			for(var j = 0; j < skillMap[skillName].jobSkillPoints.length; j++) {
				var jobObj = skillMap[skillName].jobSkillPoints[j];
				status[jobObj.job].skill[skillName] = jobObj.value;
			}
		}
	}

	function load() {
		initStatus();
		loadLvExp();
		loadSkillPt();
	}
	
	//API
	return {
		status: status,
		load: load
	};
})(jQuery);

var Base64Param = (function() {
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	var BITS_ENCODE = 6; //6ビットごとに区切ってエンコード
	var BITS_LEVEL = 8; //レベルは8ビット確保
	var BITS_SKILL = 7; //スキルは7ビット
	var BITS_TRAINING = 7; //特訓スキルポイント7ビット
	
	function encode(status) {
		//2進にして結合する
		var bitArray = [];
		for(var i = 0; i < VOCATIONS.length; i++) {
			var vocation = VOCATIONS[i];
			
			bitArray = bitArray.concat(numToBitArray(status[vocation].level, BITS_LEVEL));
			bitArray = bitArray.concat(numToBitArray(status[vocation].trainingSkillPt, BITS_TRAINING));
			
			for(var s = 0; s < SKILLS[vocation].length; s++) {
				var skillName = SKILLS[vocation][s];
				bitArray = bitArray.concat(numToBitArray(status[vocation].skill[skillName], BITS_SKILL));
			}
		}
		
		for(var i = (bitArray.length - 1) % BITS_ENCODE + 1 ; i < BITS_ENCODE; i++) bitArray.push(0); //末尾0補完
		
		var enStr = '';
		for(var i = 0; i < bitArray.length; i += BITS_ENCODE) {
			enStr += EN_CHAR.charAt(bitArrayToNum(bitArray.slice(i, i + BITS_ENCODE)));
		}
		
		return enStr;
	}
	
	function numToBitArray(num, digits) {
		var bitArray = [];
		for(var i = digits - 1; i >= 0; i--) {
			bitArray.push(num >> i & 1);
		}
		return bitArray;
	}
	function bitArrayToNum(bitArray) {
		var num = 0;
		for(var i = 0; i < bitArray.length; i++) {
			num = num << 1 | bitArray[i]
		}
		return num;
	}
	
	//API
	return {
		encode: encode,
	};
})();

HirobaStatus.load();
var query = Base64Param.encode(HirobaStatus.status);

window.open(SIMULATOR_URL + '?' + query, '_blank');

})();
