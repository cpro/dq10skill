var Simulator = (function() {
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 40;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 30;

	var DATA_JSON_URI = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'dq10skill-monster-data.json';
	
	//データロード
	var allData;
	$.ajaxSetup({async: false});
	$.getJSON(DATA_JSON_URI, function(data) {
		allData = data;
	});
	$.ajaxSetup({async: true});
	
	if(!allData) return null;

	var skillCategories = allData.skillCategories;
	var monsterList = allData.monsters;
	var skillPtsGiven = allData.skillPtsGiven;
	var expRequired = allData.expRequired;
	
	//パラメータ格納用
	var skillPts = {};
	var levels = {};
	var monsters = [];

	//パラメータ初期化
	for(var monster in monsters) {
		skillPts[monster] = {};
		for(var s = 0; s < monsters[monster].skills.length; s++) {
			var skillCategory = monsters[monster].skills[s];
			skillPts[monster][skillCategory] = 0;
		}
		levels[monster] = LEVEL_MIN;
	}
	
	/* メソッド */
	//新規モンスターオブジェクト
	function newMonster(monsterName) {
		var monsterData = monsterList[monsterName];
		var monster = {
			name: monsterName
			level: LEVEL_MIN,
			skillPts = {}
		};

		for(var s = 0; s < monsterData.skills.length; s++) {
			monster.skillPts[monsterData.skills[s]] = 0;
		}
	}
	//スキルポイント取得
	function getSkillPt(vocation, skillCategory) {
		return skillPts[vocation][skillCategory];
	}
	
	//スキルポイント更新：不正値の場合falseを返す
	function updateSkillPt(vocation, skillCategory, newValue) {
		var oldValue = skillPts[vocation][skillCategory];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		if(totalOfSameSkills(skillCategory) - oldValue + newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		skillPts[vocation][skillCategory] = newValue;
		return true;
	}
	
	//レベル値取得
	function getLevel(vocation) {
		return levels[vocation];
	}
	
	//レベル値更新
	function updateLevel(vocation, newValue) {
		var oldValue = levels[vocation];
		if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
			return oldValue;
		}
		
		levels[vocation] = newValue;
		return newValue;
	}

})();
