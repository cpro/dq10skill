/* global shortcut */
/* global RawDeflate */
/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="dq10skill-command.ts" />
/// <reference path="base64.ts" />

declare var RawDeflate: {
	deflate: (string) => any;
	inflate: (string) => any;
}
declare var shortcut: {
	add: (string, Function) => any;
}

namespace Dq10.SkillSimulator {
	export var Simulator;
	export var SimulatorDB;

(function($) {
	"use strict";

	//データJSONを格納する変数
	var DB;
	var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-data.json');
	var $dbLoad = $.getJSON(DATA_JSON_URI, function(data) {
		DB = data;
		SimulatorDB = DB;
	});

	var Simulator = (function() {
		//パラメータ格納用
		var skillPts = {};
		var levels = {};
		var trainingSkillPts = {};
		var msp = {}; //マスタースキルポイント
		var vocationIds = [];

		/* メソッド */
		//パラメータ初期化
		function initialize() {
			vocationIds = Object.keys(DB.vocations);

			vocationIds.forEach(function(vocationId) {
				skillPts[vocationId] = {};
				DB.vocations[vocationId].skillLines.forEach(function(skillLineId) {
					skillPts[vocationId][skillLineId] = 0;
				});
				levels[vocationId] = DB.consts.level.min;
				trainingSkillPts[vocationId] = DB.consts.trainingSkillPts.min;
			});
		}
		
		//スキルポイント取得
		function getSkillPt(vocationId, skillLineId) {
			return skillPts[vocationId][skillLineId];
		}
		
		//スキルポイント更新：不正値の場合falseを返す
		function updateSkillPt(vocationId, skillLineId, newValue) {
			var oldValue = skillPts[vocationId][skillLineId];
			if(newValue < DB.consts.skillPts.min || newValue > DB.consts.skillPts.max) {
				return false;
			}
			if(totalOfSameSkills(skillLineId) - oldValue + newValue > DB.consts.skillPts.max) {
				return false;
			}
			
			skillPts[vocationId][skillLineId] = newValue;
			return true;
		}
		
		//レベル値取得
		function getLevel(vocationId) {
			return levels[vocationId];
		}
		
		//レベル値更新
		function updateLevel(vocationId, newValue) {
			if(newValue < DB.consts.level.min || newValue > DB.consts.level.max) {
				return false;
			}
			
			levels[vocationId] = newValue;
			return newValue;
		}
		
		//特訓スキルポイント取得
		function getTrainingSkillPt(vocationId) {
			return trainingSkillPts[vocationId];
		}
		
		//特訓スキルポイント更新
		function updateTrainingSkillPt(vocationId, newValue) {
			if(newValue < DB.consts.trainingSkillPts.min || newValue > DB.consts.trainingSkillPts.max)
				return false;
			
			trainingSkillPts[vocationId] = newValue;
			return true;
		}

		//マスタースキルポイント取得
		function getMSP(skillLineId) {
			return msp[skillLineId] || 0;
		}

		//マスタースキルポイント更新
		function updateMSP(skillLineId, newValue) {
			var oldValue = msp[skillLineId] || 0;
			if(newValue < DB.consts.msp.min || newValue > DB.consts.msp.max)
				return false;
			if(totalMSP() - oldValue + newValue > DB.consts.msp.max)
				return false;
			if(totalOfSameSkills(skillLineId) - oldValue + newValue > DB.consts.skillPts.max)
				return false;

			msp[skillLineId] = newValue;
			return true;
		}

		//使用中のマスタースキルポイント合計
		function totalMSP() {
			return Object.keys(msp).reduce(function(prev, skillLineId) {
				return prev + msp[skillLineId];
			}, 0);
		}

		//職業のスキルポイント合計
		function totalSkillPts(vocationId) {
			var vSkillPts = skillPts[vocationId];
			return Object.keys(vSkillPts).reduce(function(prev, skillLineId) {
				return prev + vSkillPts[skillLineId];
			}, 0);
		}
		
		//同スキルのポイント合計
		function totalOfSameSkills(skillLineId) {
			var total = vocationIds.reduce(function(prev, vocationId) {
				var cur = skillPts[vocationId][skillLineId] || 0;
				return prev + cur;
			}, 0);
			total += msp[skillLineId] || 0;

			return total;
		}
		
		//特定スキルすべてを振り直し（0にセット）
		function clearPtsOfSameSkills(skillLineId) {
			vocationIds.forEach(function(vocationId) {
				if(skillPts[vocationId][skillLineId])
					updateSkillPt(vocationId, skillLineId, 0);
			});
			msp[skillLineId] = 0;
		}

		//MSPを初期化
		function clearMSP() {
			msp = {};
		}
		
		//すべてのスキルを振り直し（0にセット）
		function clearAllSkills() {
			vocationIds.forEach(function(vocationId) {
				var vSkillPts = skillPts[vocationId];
				Object.keys(vSkillPts).forEach(function(skillLineId) {
					vSkillPts[skillLineId] = 0;
				});
			});
			clearMSP();
		}
		
		//職業レベルに対するスキルポイント最大値
		function maxSkillPts(vocationId) {
			return DB.skillPtsGiven[levels[vocationId]];
		}
		
		//スキルポイント合計に対する必要レベル取得
		function requiredLevel(vocationId) {
			var trainingSkillPt = getTrainingSkillPt(vocationId);
			var total = totalSkillPts(vocationId) - trainingSkillPt;
			
			for(var l = DB.consts.level.min; l <= DB.consts.level.max; l++) {
				if(DB.skillPtsGiven[l] >= total) {
					//特訓スキルポイントが1以上の場合、最低レベル50必要
					if(trainingSkillPt > DB.consts.trainingSkillPts.min && l < DB.consts.level.forTrainingMode)
						return DB.consts.level.forTrainingMode;
					else
						return l;
				}
			}
			return NaN;
		}

		//全職業の使用可能スキルポイント
		function wholeSkillPtsAvailable() {
			return Object.keys(DB.vocations).reduce(function(prev, vocationId) {
				var cur = maxSkillPts(vocationId) + getTrainingSkillPt(vocationId);
				return prev + cur;
			}, 0);
		}

		//全職業の使用済スキルポイント
		function wholeSkillPtsUsed() {
			return Object.keys(DB.vocations).reduce(function(prev, vocationId) {
				var cur = totalSkillPts(vocationId);
				return prev + cur;
			}, 0);
		}
		
		//職業・レベルによる必要経験値
		function requiredExp(vocationId, level) {
			return DB.expRequired[DB.vocations[vocationId].expTable][level];
		}
		
		//不足経験値
		function requiredExpRemain(vocationId) {
			var required = requiredLevel(vocationId);
			if(required <= levels[vocationId]) return 0;
			var remain = requiredExp(vocationId, required) - requiredExp(vocationId, levels[vocationId]);
			return remain;
		}
		
		//全職業の必要経験値合計
		function totalRequiredExp() {
			return vocationIds.reduce(function(prev, vocationId) {
				var cur = requiredExp(vocationId, levels[vocationId]);
				return prev + cur;
			}, 0);
		}
		
		//全職業の不足経験値合計
		function totalExpRemain() {
			return vocationIds.reduce(function(prev, vocationId) {
				var cur = requiredExpRemain(vocationId);
				return prev + cur;
			}, 0);
		}
		
		//各種パッシブスキルのステータス加算合計
		//ちから      : pow
		//みのまもり  : def
		//きようさ    : dex
		//すばやさ    : spd
		//こうげき魔力: magic
		//かいふく魔力: heal
		//さいだいHP  : maxhp
		//さいだいMP  : maxmp
		//みりょく    : charm
		function totalStatus(status) {
			//スキルラインデータの各スキルから上記プロパティを調べ合計する
			var skillLineIds = Object.keys(DB.skillLines);

			return skillLineIds.reduce(function(wholeTotal, skillLineId) {
				var totalPts = totalOfSameSkills(skillLineId);

				var cur = DB.skillLines[skillLineId].skills.filter(function(skill) {
					return skill.pt <= totalPts && skill[status];
				}).reduce(function(skillLineTotal, skill) {
					return skillLineTotal + skill[status];
				}, 0);
				return wholeTotal + cur;
			}, 0);
		}
		
		//特定のパッシブスキルをすべて取得済みの状態にする
		//ステータスが変動した場合trueを返す
		function presetStatus (status) {
			var returnValue = false;

			vocationIds.forEach(function(vocationId) {
				DB.vocations[vocationId].skillLines.forEach(function(skillLineId) {
					if(!DB.skillLines[skillLineId].unique) return;

					var currentPt = getSkillPt(vocationId, skillLineId);
					var skills = DB.skillLines[skillLineId].skills.filter(function(skill) {
						return skill.pt > currentPt && skill[status];
					});
					if(skills.length > 0) {
						updateSkillPt(vocationId, skillLineId, skills[skills.length - 1].pt);
						returnValue = true;
					}
				});
			});

			return returnValue;
		}

		//現在のレベルを取得スキルに対する必要レベルにそろえる
		function bringUpLevelToRequired () {
			vocationIds.forEach(function(vocationId) {
				var required = requiredLevel(vocationId);
				if(getLevel(vocationId) < required)
					updateLevel(vocationId, required);
			});
		}

		var VOCATIONS_DATA_ORDER = [
			'warrior',       //戦士
			'priest',        //僧侶
			'mage',          //魔法使い
			'martialartist', //武闘家
			'thief',         //盗賊
			'minstrel',      //旅芸人
			'ranger',        //レンジャー
			'paladin',       //パラディン
			'armamentalist', //魔法戦士
			'luminary',      //スーパースター
			'gladiator',     //バトルマスター
			'sage',          //賢者
			'monstermaster', //まもの使い
			'itemmaster',    //どうぐ使い
			'dancer'         //踊り子
		];

		function serialize() {
			var serial = '';
			var toByte = String.fromCharCode;

			//先頭に職業の数を含める
			serial += toByte(VOCATIONS_DATA_ORDER.length);

			VOCATIONS_DATA_ORDER.forEach(function(vocationId) {
				serial += toByte(getLevel(vocationId));
				serial += toByte(getTrainingSkillPt(vocationId));

				DB.vocations[vocationId].skillLines.forEach(function(skillLineId) {
					serial += toByte(getSkillPt(vocationId, skillLineId));
				});
			});
			//末尾にMSPのスキルラインIDとポイントをペアで格納
			Object.keys(msp).forEach(function(skillLineId) {
				if(msp[skillLineId] > 0) {
					serial += toByte(DB.skillLines[skillLineId].id) + toByte(msp[skillLineId]);
				}
			});
			return serial;
		}
		function deserialize(serial) {
			var cur = 0;
			var getData = function() {
				return serial.charCodeAt(cur++);
			};
			
			//先頭に格納されている職業の数を取得
			var vocationCount = getData();

			for(var i = 0; i < vocationCount; i++) {
				var vocationId = VOCATIONS_DATA_ORDER[i];
				var vSkillLines = DB.vocations[vocationId].skillLines;

				if(serial.length - cur < 1 + 1 + vSkillLines.length)
					break;

				updateLevel(vocationId, getData());
				updateTrainingSkillPt(vocationId, getData());

				for(var s = 0; s < vSkillLines.length; s++) {
					updateSkillPt(vocationId, vSkillLines[s], getData());
				}
			}
			//末尾にデータがあればMSPとして取得
			var skillLineIds = [];
			Object.keys(DB.skillLines).forEach(function(skillLineId) {
				skillLineIds[DB.skillLines[skillLineId].id] = skillLineId;
			});

			while(serial.length - cur >= 2) {
				var skillLineId = skillLineIds[getData()];
				var skillPt = getData();
				if(skillLineId !== undefined)
					updateMSP(skillLineId, skillPt);
			}
		}

		function deserializeBit(serial) {
			var BITS_LEVEL = 8; //レベルは8ビット確保
			var BITS_SKILL = 7; //スキルは7ビット
			var BITS_TRAINING = 7; //特訓スキルポイント7ビット
			
			var bitArray = [];
			for(var i = 0; i < serial.length; i++)
				bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));

			//特訓ポイントを含むかどうか: ビット列の長さで判断
			var isIncludingTrainingPts = bitArray.length >= (
				BITS_LEVEL +
				BITS_TRAINING +
				BITS_SKILL * DB.vocations[VOCATIONS_DATA_ORDER[0]].skillLines.length
			) * 10; //1.2VU（特訓モード実装）時点の職業数
			
			var cur = 0;
			for(i = 0; i < VOCATIONS_DATA_ORDER.length; i++) {
				var vocationId = VOCATIONS_DATA_ORDER[i];

				updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));

				if(isIncludingTrainingPts)
					updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
				else
					updateTrainingSkillPt(vocationId, 0);

				for(var s = 0; s < DB.vocations[vocationId].skillLines.length; s++) {
					var skillLineId = DB.vocations[vocationId].skillLines[s];
					updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
				}
			}

			function bitArrayToNum(bitArray) {
				var num = 0;
				for(var i = 0; i < bitArray.length; i++) {
					num = num << 1 | bitArray[i];
				}
				return num;
			}
			function numToBitArray(num, digits) {
				var bitArray = [];
				for(var i = digits - 1; i >= 0; i--) {
					bitArray.push(num >> i & 1);
				}
				return bitArray;
			}
		}

		//API
		return {
			//メソッド
			initialize: initialize,
			getSkillPt: getSkillPt,
			updateSkillPt: updateSkillPt,
			getLevel: getLevel,
			updateLevel: updateLevel,
			getTrainingSkillPt : getTrainingSkillPt,
			updateTrainingSkillPt : updateTrainingSkillPt,
			getMSP: getMSP,
			updateMSP: updateMSP,
			totalMSP: totalMSP,
			totalSkillPts: totalSkillPts,
			totalOfSameSkills: totalOfSameSkills,
			clearPtsOfSameSkills: clearPtsOfSameSkills,
			clearMSP: clearMSP,
			clearAllSkills: clearAllSkills,
			maxSkillPts: maxSkillPts,
			wholeSkillPtsAvailable: wholeSkillPtsAvailable,
			wholeSkillPtsUsed: wholeSkillPtsUsed,
			requiredLevel: requiredLevel,
			requiredExp: requiredExp,
			requiredExpRemain: requiredExpRemain,
			totalRequiredExp: totalRequiredExp,
			totalExpRemain: totalExpRemain,
			totalStatus: totalStatus,
			presetStatus: presetStatus,
			bringUpLevelToRequired: bringUpLevelToRequired,
			serialize: serialize,
			deserialize: deserialize,
			deserializeBit: deserializeBit
		};
	})();
	Dq10.SkillSimulator.Simulator = Simulator;
	
	var SimulatorCommandManager = new CommandManager();

	var SimulatorUI = (function() {
		var CLASSNAME_SKILL_ENABLED = 'enabled';
		var CLASSNAME_ERROR = 'error';
		
		var sim = Simulator;
		var com = SimulatorCommandManager;

		var $ptConsole, $lvConsole, $trainingPtConsole;
		
		var mspMode = false; //MSP編集モードフラグ

		function refreshAll() {
			hideConsoles();
			refreshAllVocationInfo();
			for(var skillLineId in DB.skillLines) {
				refreshSkillList(skillLineId);
			}
			//refreshTotalRequiredExp();
			//refreshTotalExpRemain();
			refreshTotalSkillPt();
			refreshTotalPassive();
			refreshControls();
			refreshSaveUrl();
			refreshUrlBar();
		}
		
		function refreshVocationInfo(vocationId) {
			var currentLevel = sim.getLevel(vocationId);
			var requiredLevel = sim.requiredLevel(vocationId);
			
			//見出し中のレベル数値
			$('#' + vocationId + ' .lv_h2').text(currentLevel);
			var $levelH2 = $('#' + vocationId + ' h2');
			
			//必要経験値
			$('#' + vocationId + ' .exp').text(numToFormedStr(sim.requiredExp(vocationId, currentLevel)));
			
			//スキルポイント 残り / 最大値
			var maxSkillPts = sim.maxSkillPts(vocationId);
			var additionalSkillPts = sim.getTrainingSkillPt(vocationId);
			var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocationId);
			var $skillPtsText = $('#' + vocationId + ' .pts');
			$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
			$('#training-' + vocationId).text(additionalSkillPts);
			
			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			
			$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
			$('#' + vocationId + ' .error').toggle(isLevelError);
			if(isLevelError) {
				$('#' + vocationId + ' .req_lv').text(numToFormedStr(requiredLevel));
				$('#' + vocationId + ' .exp_remain').text(numToFormedStr(sim.requiredExpRemain(vocationId)));
			}
		}
		
		function refreshAllVocationInfo() {
			for(var vocationId in DB.vocations) {
				refreshVocationInfo(vocationId);
			}
		}
		
		function refreshTotalRequiredExp() {
			$('#total_exp').text(numToFormedStr(sim.totalRequiredExp()));
		}
		
		function refreshTotalExpRemain() {
			var totalExpRemain = sim.totalExpRemain();
			$('#total_exp_remain, #total_exp_remain_label').toggleClass(CLASSNAME_ERROR, totalExpRemain > 0);
			$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
		}
		
		function refreshTotalPassive() {
			var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
			for(var i = 0; i < status.length; i++) {
				$('#total_' + status[i]).text(sim.totalStatus(status[i]));
			}
			$('#msp_remain').text((DB.consts.msp.max - sim.totalMSP()).toString() + 'P');
		}
		
		function refreshSkillList(skillLineId) {
			$('tr[class^=' + skillLineId + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
			var totalOfSkill = sim.totalOfSameSkills(skillLineId);
			var skills = DB.skillLines[skillLineId].skills;
			for(var s = 0; s < skills.length; s++) {
				if(totalOfSkill < skills[s].pt)
					break;
				
				$('.' + skillLineId + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
			}
			$('.' + skillLineId + ' .skill_total').text(totalOfSkill);

			var msp = sim.getMSP(skillLineId);
			if(msp > 0)
				$('<span>(' + msp.toString() + ')</span>')
					.addClass('msp')
					.appendTo('.' + skillLineId + ' .skill_total');
		}
		
		function refreshControls() {
			for(var vocationId in DB.vocations) {
				for(var s = 0; s < DB.vocations[vocationId].skillLines.length; s++) {
					var skillLineId = DB.vocations[vocationId].skillLines[s];
					refreshCurrentSkillPt(vocationId, skillLineId);
				}
			}
		}
		
		function refreshCurrentSkillPt(vocationId, skillLineId) {
			$('#' + vocationId + ' .' + skillLineId + ' .skill_current').text(sim.getSkillPt(vocationId, skillLineId));
		}

		function refreshTotalSkillPt() {
			var $cont = $('#total_sp');
			var available = sim.wholeSkillPtsAvailable();
			var remain = available - sim.wholeSkillPtsUsed();

			$cont.text(remain.toString() + ' / ' + available.toString());
			var isLevelError = (remain < 0);
			$cont.toggleClass(CLASSNAME_ERROR, isLevelError);
		}

		function refreshSaveUrl() {
			var url = makeCurrentUrl();
			
			$('#url_text').val(url);
			
			var params = {
				text: 'DQ10 現在のスキル構成:',
				hashtags: 'DQ10, dq10_skillsim',
				url: url,
				original_referer: window.location.href,
				tw_p: 'tweetbutton'
			};
			$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
		}
		
		function refreshUrlBar() {
			if(window.history && window.history.replaceState) {
				var url = makeCurrentUrl();
				history.replaceState(url, null, url);
			}
		}

		function makeCurrentUrl() {
			return window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(RawDeflate.deflate(sim.serialize()));

		}

		function selectSkillLine(skillLineId) {
			$('.skill_table').removeClass('selected');
			$('.' + skillLineId).addClass('selected');
		}

		function toggleMspMode(mode) {
			mspMode = mode;
			$('body').toggleClass('msp', mode);
		}

		function getCurrentVocation(currentNode) {
			return $(currentNode).parents('.class_group').attr('id');
		}

		function getCurrentSkillLine(currentNode) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		function hideConsoles() {
			$ptConsole.hide();
			$lvConsole.hide();
			$trainingPtConsole.hide();
		}

		function setup() {
			for(var i = 0; i < setupFunctions.length; i++) {
				setupFunctions[i]();
			}
			refreshAll();
		}
		
		var setupFunctions = [
			//イベント登録
			function() {
				com.on('VocationalInfoChanged', function(vocationId) {
					refreshVocationInfo(vocationId);
					//refreshTotalRequiredExp();
					//refreshTotalExpRemain();
					refreshTotalSkillPt();
					refreshUrlBar();
				});
				com.on('SkillLineChanged', function(vocationId, skillLineId) {
					refreshCurrentSkillPt(vocationId, skillLineId);
					refreshSkillList(skillLineId);
					refreshAllVocationInfo();
					//refreshTotalExpRemain();
					refreshTotalSkillPt();
					refreshTotalPassive();
					refreshUrlBar();
				});
				com.on('MSPChanged', function(skillLineId) {
					refreshSkillList(skillLineId);
					refreshTotalPassive();
					refreshUrlBar();
				});
				com.on('WholeChanged', function() {
					refreshAll();
				});
			},

			//レベル選択セレクトボックス項目設定
			function() {
				$lvConsole = $('#lv_console');
				var $select = $('#lv-select');
				for(var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
					$select.append($("<option />").val(i).text(i.toString() + ' (' + DB.skillPtsGiven[i].toString() + ')'));
				}

				$select.change(function() {
					var vocationId = getCurrentVocation(this);
					com.updateLevel(vocationId, $(this).val());
				});
			},
			
			//レベル欄クリック時にUI表示
			function() {
				$('.ent_title h2').click(function(e) {
					hideConsoles();

					var vocationId = getCurrentVocation(this);
					var consoleLeft = $(this).find('.lv_h2').position().left - 3;

					$lvConsole.appendTo($(this)).css({left: consoleLeft});
					$('#lv-select').val(sim.getLevel(vocationId));

					$lvConsole.show();
					e.stopPropagation();
				});
			},

			//特訓ポイント選択セレクトボックス設定
			function() {
				$trainingPtConsole = $('#training_pt_console');
				var $select = $('#training_pt_select');
				for(var i = 0; i <= DB.consts.trainingSkillPts.max; i++) {
					$select.append($('<option />').val(i).text(i.toString() +
						' (' + numToFormedStr(DB.trainingPts[i].stamps) + ')'));
				}

				$select.change(function() {
					var vocationId = getCurrentVocation(this);

					return com.updateTrainingSkillPt(vocationId, parseInt($(this).val(), 10));
				});
			},
			
			//特訓表示欄クリック時にUI表示
			function() {
				$('.ent_title .training_pt').click(function(e) {
					hideConsoles();
					
					var vocationId = getCurrentVocation(this);
					var consoleLeft = $('#training-' + vocationId).position().left - 3;

					$trainingPtConsole.appendTo($(this)).css({left: consoleLeft});
					$('#training_pt_select').val(sim.getTrainingSkillPt(vocationId));

					$trainingPtConsole.show();
					e.stopPropagation();
				});
			},
			
			//スピンボタン設定
			function() {
				$ptConsole = $('#pt_console');
				var $spinner = $('#pt_spinner');
				$spinner.spinner({
					min: DB.consts.skillPts.min,
					max: DB.consts.skillPts.max,
					spin: function (e, ui) {
						var vocationId = getCurrentVocation(this);
						var skillLineId = getCurrentSkillLine(this);

						var succeeded = mspMode ?
							com.updateMSP(skillLineId, parseInt(ui.value, 10)) :
							com.updateSkillPt(vocationId, skillLineId, parseInt(ui.value, 10));

						if(succeeded) {
							e.stopPropagation();
						} else {
							return false;
						}
					},
					change: function (e, ui) {
						var vocationId = getCurrentVocation(this);
						var skillLineId = getCurrentSkillLine(this);
						var newValue = $(this).val();
						var oldValue = mspMode ?
							sim.getMSP(skillLineId) :
							sim.getSkillPt(vocationId, skillLineId);

						if(isNaN(newValue)) {
							$(this).val(oldValue);
							return false;
						}
						
						newValue = parseInt(newValue, 10);
						if(newValue == oldValue)
							return false;

						var succeeded = mspMode ?
							com.updateMSP(skillLineId, newValue) :
							com.updateSkillPt(vocationId, skillLineId, newValue);

						if(!succeeded) {
							$(this).val(oldValue);
							return false;
						}
					},
					stop: function (e, ui) {
						var skillLineId = getCurrentSkillLine(this);
						selectSkillLine(skillLineId);
					}
				});
			},
			
			//スピンコントロール共通
			function() {
				$('input.ui-spinner-input').click(function(e) {
					//テキストボックスクリック時数値を選択状態に
					$(this).select();
				}).keypress(function(e) {
					//テキストボックスでEnter押下時更新して選択状態に
					if(e.which == 13) {
						$('#url_text').focus();
						$(this).focus().select();
					}
				});
			},

			//スキルライン名クリック時にUI表示
			function() {
				$('.skill_table caption').click(function(e) {
					hideConsoles();
					
					var vocationId = getCurrentVocation(this);
					var skillLineId = getCurrentSkillLine(this);

					//位置決め
					var $baseSpan = $(this).find('.skill_current');
					var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
					$('#pt_reset').css({'margin-left': $(this).find('.skill_total').width() + 10});

					$ptConsole.appendTo($(this).find('.console_wrapper')).css({left: consoleLeft});
					$('#pt_spinner').val(mspMode ? sim.getMSP(skillLineId) : sim.getSkillPt(vocationId, skillLineId));

					selectSkillLine(skillLineId);

					$ptConsole.show();
					e.stopPropagation();
				});
			},

			//範囲外クリック時・ESCキー押下時にUI非表示
			function() {
				$ptConsole.click(function(e) {e.stopPropagation();});
				$lvConsole.click(function(e) {e.stopPropagation();});
				$trainingPtConsole.click(function(e) {e.stopPropagation();});

				$('body').click(hideConsoles).keydown(function(e) {
					if(e.which == 27) hideConsoles();
				});
			},

			//リセットボタン設定
			function() {
				$('#pt_reset').button({
					icons: { primary: 'ui-icon-refresh' },
					text: false
				}).click(function (e) {
					var vocationId = getCurrentVocation(this);
					var skillLineId = getCurrentSkillLine(this);
					
					selectSkillLine(skillLineId);

					if(mspMode)
						com.updateMSP(skillLineId, 0);
					else
						com.updateSkillPt(vocationId, skillLineId, 0);
					$('#pt_spinner').val(0);
				}).dblclick(function (e) {
					var skillLineId;
					//ダブルクリック時に各職業の該当スキルをすべて振り直し
					if(mspMode) {
						if(!window.confirm('マスタースキルポイントをすべて振りなおします。'))
							return;

						com.clearMSP();
					} else {
						skillLineId = getCurrentSkillLine(this);
						var skillName = DB.skillLines[skillLineId].name;
						
						if(!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
							return;
						
						com.clearPtsOfSameSkills(skillLineId);
						$('.' + skillLineId + ' .skill_current').text('0');
					}

					$('#pt_spinner').val(0);
				});
			},
			
			//スキルテーブル項目クリック時
			function() {
				$('.skill_table tr[class]').click(function() {
					var vocationId = getCurrentVocation(this);
					var skillLineId = getCurrentSkillLine(this);
					var skillIndex = parseInt($(this).attr('class').replace(skillLineId + '_', ''), 10);
					
					selectSkillLine(skillLineId);

					var requiredPt = DB.skillLines[skillLineId].skills[skillIndex].pt;
					var totalPtsOfOthers;
					if(mspMode) {
						totalPtsOfOthers = sim.totalOfSameSkills(skillLineId) - sim.getMSP(skillLineId);
						if(requiredPt < totalPtsOfOthers) return;

						com.updateMSP(skillLineId, requiredPt - totalPtsOfOthers);
					} else {
						totalPtsOfOthers = sim.totalOfSameSkills(skillLineId) - sim.getSkillPt(vocationId, skillLineId);
						if(requiredPt < totalPtsOfOthers) return;

						com.updateSkillPt(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
					}
				});
			},
			
			//MSPモード切替ラジオボタン
			function() {
				$('#msp_selector input').change(function(e) {
					toggleMspMode($(this).val() == 'msp');
				});
			},

			//URLテキストボックスクリック・フォーカス時
			function() {
				$('#url_text').focus(function() {
					refreshSaveUrl();
				}).click(function() {
					$(this).select();
				});
			},
			
			//保存用URLツイートボタン設定
			function() {
				$('#tw-saveurl').button().click(function(e) {
					refreshSaveUrl();

					var screenWidth = screen.width, screenHeight = screen.height;
					var windowWidth = 550, windowHeight = 420;
					var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
					var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
					var windowParams = {
						scrollbars: 'yes',
						resizable: 'yes',
						toolbar: 'no',
						location: 'yes',
						width: windowWidth,
						height: windowHeight,
						left: windowLeft,
						top: windowTop
					};
					var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
					window.open(this.href, null, windowParam);
					
					return false;
				});
			},
			
			//おりたたむ・ひろげるボタン設定
			function() {
				var HEIGHT_FOLDED = '48px';
				var HEIGHT_UNFOLDED = $('.class_group:last').height() + 'px';
				var CLASSNAME_FOLDED = 'folded';

				$('.toggle_ent').button({
					icons: { primary: 'ui-icon-arrowthickstop-1-n' },
					text: false,
					label: 'おりたたむ'
				}).click(function() {
					var $entry = $(this).parents('.class_group');
					$entry.toggleClass(CLASSNAME_FOLDED);

					if($entry.hasClass(CLASSNAME_FOLDED)) {
						$entry.animate({height: HEIGHT_FOLDED});
						$(this).button('option', {
							icons: {primary: 'ui-icon-arrowthickstop-1-s'},
							label: 'ひろげる'
						});
					} else {
						$entry.animate({height: HEIGHT_UNFOLDED});
						$(this).button('option', {
							icons: {primary: 'ui-icon-arrowthickstop-1-n'},
							label: 'おりたたむ'
						});
					}
				});
				
				//すべておりたたむ・すべてひろげる
				$('#fold-all').click(function(e) {
					$('.class_group:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
					$('body, html').animate({scrollTop: 0});
				});
				$('#unfold-all').click(function(e) {
					$('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
					$('body, html').animate({scrollTop: 0});
				});
				
				var bodyTop = $('#body_content').offset().top;
				
				//特定職業のみひろげる
				$('#foldbuttons-vocation a').click(function(e) {
					var vocationId = $(this).attr('id').replace('fold-', '');
					$('body, html').animate({scrollTop: $('#' + vocationId).offset().top - bodyTop});
					if($('#' + vocationId).hasClass(CLASSNAME_FOLDED))
						$('#' + vocationId + ' .toggle_ent').click();
				});
			},
			
			//レベル一括設定
			function() {
				//セレクトボックス初期化
				var $select = $('#setalllevel>select');
				for(var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
					$select.append($("<option />").val(i).text(i.toString()));
				}
				$select.val(DB.consts.level.max);
				
				$('#setalllevel>button').button().click(function(e) {
					com.setAllLevel($select.val());
				});
			},

			//特訓スキルポイント一括設定（最大値固定）
			function() {
				$('#setalltrainingsp>button').button({
					icons: { primary: 'ui-icon-star' },
				}).click(function(e) {
					com.setAllTrainingSkillPt(DB.consts.trainingSkillPts.max);
				});
			},
			
			//全スキルをリセット
			function() {
				$('#clearallskills>button').button({
					icons: { primary: 'ui-icon-refresh' },
				}).click(function(e) {
					if(!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
						return;
					
					com.clearAllSkills();
				});
			},
			
			//ナビゲーションボタン
			function() {
				$('a#hirobaimport').button({
					icons: { primary: 'ui-icon-arrowreturnthick-1-s'}
				});
				$('a#simpleui').button({
					icons: { primary: 'ui-icon-transfer-e-w'}
				}).click(function(e) {
					this.href = this.href.replace(/\?.+$/, '') + '?' +
						Base64.btoa(RawDeflate.deflate(sim.serialize()));
				});

			},
			
			//スキル選択時に同スキルを強調
			function() {
				$('.skill_table').click(function(e) {
					var skillLineId = $(this).attr('class').split(' ')[0];
					$('.skill_table').removeClass('selected');
					$('.' + skillLineId).addClass('selected');
				});
			},

			//パッシブプリセット
			function() {
				//セレクトボックス初期化
				var SELECT_TABLE = [
					{val: 'pow',   text: 'ちから'},
					{val: 'def',   text: 'みのまもり'},
					{val: 'dex',   text: 'きようさ'},
					{val: 'spd',   text: 'すばやさ'},
					{val: 'magic', text: 'こうげき魔力'},
					{val: 'heal',  text: 'かいふく魔力'},
					{val: 'charm', text: 'みりょく'},
					{val: 'maxhp', text: 'さいだいHP'},
					{val: 'maxmp', text: 'さいだいMP'},
					{val: 'maxhp;maxmp', text: 'さいだいHP・MP'}
				];

				var $select = $('#preset>select');
				for(var i = 0; i < SELECT_TABLE.length; i++) {
					$select.append($("<option />").val(SELECT_TABLE[i].val).text(SELECT_TABLE[i].text));
				}
				$select.val('maxhp;maxmp');

				$('#preset>button').button().click(function(e) {
					com.presetStatus($select.val());
				});
			},

			//全職業のレベルを取得スキルに応じて引き上げ
			function() {
				$('#bringUpLevel>button').button({
					icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				}).click(function(e) {
					if(!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで引き上げます。'))
						return;
					
					com.bringUpLevelToRequired();
				});
			},

			//undo/redo
			function() {
				var $undoButton = $('#undo');
				var $redoButton = $('#redo');

				$undoButton.button({
					icons: { primary: 'ui-icon-arrowreturnthick-1-w' },
					disabled: true
				}).click(function(e) {
					hideConsoles();
					com.undo();
					refreshAll();
				});

				$redoButton.button({
					icons: { secondary: 'ui-icon-arrowreturnthick-1-e' },
					disabled: true
				}).click(function(e) {
					hideConsoles();
					com.redo();
					refreshAll();
				});

				com.on('CommandStackChanged', function() {
					$undoButton.button('option', 'disabled', !com.isUndoable());
					$redoButton.button('option', 'disabled', !com.isRedoable());
				});

				shortcut.add('Ctrl+Z', function() {
					$undoButton.click();
				});
				shortcut.add('Ctrl+Y', function() {
					$redoButton.click();
				});
			}
		];
		
		//数値を3桁区切りに整形
		function numToFormedStr(num) {
			if(isNaN(num)) return 'N/A';
			return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
		}
		
		//API
		return {
			setup: setup,
			refreshAll: refreshAll
		};

	})();

	var SimpleUI = (function() {
		var CLASSNAME_SKILL_ENABLED = 'enabled';
		var CLASSNAME_ERROR = 'error';
		
		var sim = Simulator;

		var $ptConsole, $lvConsole, $trainingPtConsole;
		
		function refreshAll() {
			refreshAllVocationInfo();
			for(var skillLineId in DB.skillLines) {
				refreshSkillList(skillLineId);
			}
			//refreshTotalRequiredExp();
			//refreshTotalExpRemain();
			// refreshTotalPassive();
			refreshControls();
			refreshSaveUrl();
		}
		
		function refreshVocationInfo(vocationId) {
			var currentLevel = sim.getLevel(vocationId);
			var requiredLevel = sim.requiredLevel(vocationId);
			
			//スキルポイント 残り / 最大値
			var maxSkillPts = sim.maxSkillPts(vocationId);
			var additionalSkillPts = sim.getTrainingSkillPt(vocationId);
			var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocationId);

			$('#' + vocationId + ' .remain .container').text(remainingSkillPts);
			$('#' + vocationId + ' .total .container').text(maxSkillPts + additionalSkillPts);
			$('#' + vocationId + ' .level').text('Lv ' + currentLevel + ' (' + maxSkillPts + ') + 特訓 (' + additionalSkillPts + ')');
			
			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			$('#' + vocationId + ' .remain .container').toggleClass(CLASSNAME_ERROR, isLevelError);
		}
		
		function refreshAllVocationInfo() {
			for(var vocationId in DB.vocations) {
				refreshVocationInfo(vocationId);
			}
			$('#msp .remain .container').text(DB.consts.msp.max - sim.totalMSP());
			$('#msp .total .container').text(DB.consts.msp.max);
		}
		
		function refreshTotalRequiredExp() {
			$('#total_exp').text(numToFormedStr(sim.totalRequiredExp()));
		}
		
		function refreshTotalExpRemain() {
			var totalExpRemain = sim.totalExpRemain();
			$('#total_exp_remain, #total_exp_remain_label').toggleClass(CLASSNAME_ERROR, totalExpRemain > 0);
			$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
		}
		
		function refreshTotalPassive() {
			var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
			for(var i = 0; i < status.length; i++) {
				$('#total_' + status[i]).text(sim.totalStatus(status[i]));
			}
		}
		
		function refreshSkillList(skillLineId) {
			var totalOfSkill = sim.totalOfSameSkills(skillLineId);
			$('#footer .' + skillLineId + ' .container').text(totalOfSkill);

			var containerName = '#msp .' + skillLineId;
			if(DB.skillLines[skillLineId].unique) {
				for(var vocationId in DB.vocations) {
					if($.inArray(skillLineId, DB.vocations[vocationId].skillLines) >= 0) {
						containerName = '#' + vocationId + ' .msp';
						break;
					}
				}
			}

			var msp = sim.getMSP(skillLineId);
			$(containerName + ' .container').text(msp > 0 ? msp : '');
		}
		
		function refreshControls() {
			for(var vocationId in DB.vocations) {
				for(var s = 0; s < DB.vocations[vocationId].skillLines.length; s++) {
					var skillLineId = DB.vocations[vocationId].skillLines[s];
					refreshCurrentSkillPt(vocationId, skillLineId);
				}
			}
		}
		
		function refreshCurrentSkillPt(vocationId, skillLineId) {
			var containerName = skillLineId;
			if(DB.skillLines[skillLineId].unique) {
				//踊り子のパッシブ2種に対応
				if(skillLineId == 'song') {
					containerName = 'unique2';
				} else {
					containerName = 'unique';
				}
			}

			$('#' + vocationId + ' .' + containerName + ' .container')
				.text(sim.getSkillPt(vocationId, skillLineId));
		}

		function refreshSaveUrl() {
			var url = makeCurrentUrl();

			$('#url_text').val(url);
			
			var params = {
				text: 'DQ10 現在のスキル構成:',
				hashtags: 'DQ10, dq10_skillsim',
				url: url,
				original_referer: window.location.href,
				tw_p: 'tweetbutton'
			};
			$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
		}
		
		function refreshUrlBar() {
			if(window.history && window.history.replaceState) {
				var url = makeCurrentUrl();
				window.history.replaceState(url, null, url);
			}
		}

		function makeCurrentUrl() {
			return window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(RawDeflate.deflate(sim.serialize()));

		}

		function getCurrentVocation(currentNode) {
			return $(currentNode).parents('.class_group').attr('id');
		}

		function getCurrentSkillLine(currentNode) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		function setup() {
			for(var i = 0; i < setupFunctions.length; i++) {
				setupFunctions[i]();
			}
			refreshAll();
		}
		
		var setupFunctions = [
			
			//URLテキストボックスクリック・フォーカス時
			function() {
				$('#url_text').focus(function() {
					refreshSaveUrl();
				}).click(function() {
					$(this).select();
				});
			},
			
			//保存用URLツイートボタン設定
			function() {
				$('#tw-saveurl').button().click(function(e) {
					refreshSaveUrl();

					var screenWidth = screen.width, screenHeight = screen.height;
					var windowWidth = 550, windowHeight = 420;
					var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
					var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
					var windowParams = {
						scrollbars: 'yes',
						resizable: 'yes',
						toolbar: 'no',
						location: 'yes',
						width: windowWidth,
						height: windowHeight,
						left: windowLeft,
						top: windowTop
					};
					var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
					window.open(this.href, null, windowParam);
					
					return false;
				});
			},
			
			//ナビゲーションボタン
			function() {
				$('a#mainui').button({
					icons: { primary: 'ui-icon-transfer-e-w'}
				}).click(function(e) {
					this.href = this.href.replace(/\?.+$/, '') + '?' +
						Base64.btoa(RawDeflate.deflate(sim.serialize()));
				});

			}
		];
		
		//数値を3桁区切りに整形
		function numToFormedStr(num) {
			if(isNaN(num)) return 'N/A';
			return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
		}
		
		//API
		return {
			setup: setup,
			refreshAll: refreshAll
		};

	})();

	//ロード時
	$(function() {
		function loadQuery() {
			var query = window.location.search.substring(1);
			if(Base64.isValid(query)) {
				var serial = '';

				try {
					serial = RawDeflate.inflate(Base64.atob(query));
				} catch(e) {
				}
				
				if(serial.length < 33) { //バイト数が小さすぎる場合inflate失敗とみなす。(8+7*5)*6/8=32.25
					serial = Base64.atob(query);
					Simulator.deserializeBit(serial);
				} else {
					Simulator.deserialize(serial);
				}
			}
		}
		
		var ui = window.location.pathname.indexOf('/simple.html') > 0 ? SimpleUI : SimulatorUI;

		$dbLoad.done(function(data) {
			Simulator.initialize();

			loadQuery();
			ui.setup();
		});
	});
})(jQuery);
}
