/* global skillMap */
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
	'賢者',
	'まもの使い',
	'どうぐ使い',
	'踊り子'
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
	'スーパースター': ['ムチ', '扇', 'スティック', '格闘', 'オーラ'],
	'まもの使い': ['ムチ', 'ツメ', '両手剣', 'オノ', 'まものマスター'],
	'どうぐ使い': ['ブーメラン', 'ハンマー', 'ヤリ', '弓', 'アイテムマスター'],
	'踊り子': ['短剣', '扇', 'スティック', 'うた', 'おどり']
};
var MSP_SKILLLINE_ORDER = [
	'片手剣', '両手剣', 'オノ', '盾', 'ゆうかん', 'ヤリ',
	'スティック', '棍', 'しんこう心', '両手杖', '短剣', 'ムチ',
	'まほう', 'ツメ', '扇', '格闘', 'きあい', 'おたから',
	'きょくげい', 'ハンマー', 'はくあい', '弓', 'ブーメラン', 'サバイバル',
	'フォース', 'オーラ', 'とうこん', 'さとり', 'まものマスター', 'アイテムマスター',
	'うた', 'おどり'
];

var TRAINING_TABLE = [
	{stamp:    0, skillPt:  0},
	{stamp:  100, skillPt:  1},
	{stamp:  300, skillPt:  2},
	{stamp:  600, skillPt:  3},
	{stamp: 1000, skillPt:  4},
	{stamp: 1500, skillPt:  5},
	{stamp: 2000, skillPt:  6},
	{stamp: 2500, skillPt:  7},
	{stamp: 3000, skillPt:  8},
	{stamp: 3500, skillPt:  9},
	{stamp: 4000, skillPt: 10},
	{stamp: 4500, skillPt: 11},
	{stamp: 5000, skillPt: 12},
	{stamp: 5500, skillPt: 13},
	{stamp: 6000, skillPt: 14},
	{stamp: 6500, skillPt: 15},
	{stamp: 7000, skillPt: 16},
	{stamp: 8000, skillPt: 17}
];

var HirobaStatus = (function($) {
	var status = {};
	var msp = {};

	function initStatus() {
		for(var i = 0; i < VOCATIONS.length; i++) {
			var vocation = VOCATIONS[i];
			status[vocation] = {
				skill: {},
				level: 1,
				trainingSkillPt: 0
			};
		}
	}
	
	function loadLvExp() {
		var vocation = '';
		$('#jobLvExp tr td[class^=col]').each(function() {
			switch($(this).attr('class').split(/\s+/)[0]) {
				case 'col1': //職業名
					vocation = $(this).text().trim();
					break;
				case 'col2': //レベル
					status[vocation].level = parseInt($(this).text().trim());
					break;
				case 'col3': //次のレベルまで
					break;
				case 'col4':
					var trainingStamp = parseInt($(this).text().trim().replace(',', ''));
					var trainingSkillPt = 0;
					
					for(var i = 0; i < TRAINING_TABLE.length; i++) {
						if(trainingStamp < TRAINING_TABLE[i].stamp) break;
						trainingSkillPt = TRAINING_TABLE[i].skillPt;
					}
					status[vocation].trainingSkillPt = trainingSkillPt;
					break;
			}
		});
	}
	
	function loadSkillPt() {
		for(var skillName in skillMap) {
			for(var j = 0; j < skillMap[skillName].jobSkillPoints.length; j++) {
				var jobObj = skillMap[skillName].jobSkillPoints[j];
				if($.inArray(jobObj.job, VOCATIONS) >= 0)
					status[jobObj.job].skill[skillName] = jobObj.value;
				else if(jobObj.job == 'マスタースキル')
					msp[skillName] = jobObj.value;
			}
		}
	}

	function load() {
		initStatus();
		loadLvExp();
		loadSkillPt();
	}

	function serialize() {
		var serial = '';
		var toByte = String.fromCharCode;

		var vocationCount = VOCATIONS.length;
		//先頭に職業の数を含める
		serial += toByte(vocationCount);

		var skillLine;
		for(var i = 0; i < vocationCount; i++) {
			var vocation = VOCATIONS[i];
			var stat = status[vocation];
			serial += toByte(stat.level);
			serial += toByte(stat.trainingSkillPt);

			for(var s = 0; s < SKILLS[vocation].length; s++) {
				skillLine = SKILLS[vocation][s];
				serial += toByte(stat.skill[skillLine]);
			}
		}
		for(i = 0; i < MSP_SKILLLINE_ORDER.length; i++) {
			skillLine = MSP_SKILLLINE_ORDER[i];
			if((msp[skillLine] || 0) > 0)
				serial += toByte(i + 1) + toByte(msp[skillLine]);
		}
		return serial;
	}
	
	//API
	return {
		serialize: serialize,
		load: load
	};
})(jQuery);

//Base64 URI safe
//btoaのみ
var Base64 = (function(global) {
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

	var _btoa_impl = function(b) {
		return b.replace(/.{1,3}/g, function(m) {
			var bits = 0;
			for(var i = 0; i < m.length; i++)
				bits = bits | (m.charCodeAt(i) << ((2 - i) * 8));

			return [
				EN_CHAR.charAt(bits >>> 18),
				EN_CHAR.charAt((bits >>> 12) & 63),
				m.length > 1 ? EN_CHAR.charAt((bits >>> 6) & 63) : '',
				m.length > 2 ? EN_CHAR.charAt(bits & 63) : ''
			].join('');
		});
	};

	var btoa = global.btoa ? function(b) {
		return global.btoa(b)
			.replace(/[+\/]/g, function(m0) {return m0 == '+' ? '-' : '_';})
			.replace(/=/g, '');
	} : _btoa_impl;

	//API
	return {
		btoa: btoa
	};
})(window);

$.getScript(SIMULATOR_URL + 'js/rawdeflate.min.js', function() {
	HirobaStatus.load();
	var url = SIMULATOR_URL + '?' +
		Base64.btoa(RawDeflate.deflate(HirobaStatus.serialize()));

	window.open(url, '_blank');
});

})();
