(function($) {
	"use strict";

	//データJSONを格納する変数
	var DB;
	var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-anlucea-data.json');
	var $dbLoad = $.getJSON(DATA_JSON_URI, function(data) {
		DB = data;
	});

	var Simulator = (function() {
		//定数
		var SKILL_PTS_MIN = 0;
		var SKILL_PTS_MAX = 40;
		var LEVEL_MIN = 20;
		var LEVEL_MAX = 55;

		//パラメータ格納用
		var skillPts = {};
		var level = LEVEL_MIN;
		var baseStatus;

		/* メソッド */
		//パラメータ初期化
		function initialize() {
			for(var skillLine in DB.skillLines) {
				skillPts[skillLine] = 0;
			}
			baseStatus = DB.status[level];
		}
		
		//スキルポイント取得
		function getSkillPt(skillLine) {
			return skillPts[skillLine];
		}
		
		//スキルポイント更新：不正値の場合falseを返す
		function updateSkillPt(skillLine, newValue) {
			if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
				return false;
			}
			
			skillPts[skillLine] = newValue;
			return true;
		}
		
		//レベル値取得
		function getLevel() {
			return level;
		}
		
		//レベル値更新
		function updateLevel(newValue) {
			var oldValue = level;
			if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
				return oldValue;
			}
			
			level = newValue;
			baseStatus = DB.status[level];
			return newValue;
		}

		//使用済みスキルポイント合計
		function totalSkillPts() {
			var total = 0;
			for(var skillLine in DB.skillLines)
				total += skillPts[skillLine];
			
			return total;
		}
		
		//すべてのスキルを振り直し（0にセット）
		function clearAllSkills() {
			for(var skillLine in DB.skillLines) {
				skillPts[skillLine] = 0;
			}
		}
		
		//レベルに対するスキルポイント最大値
		function maxSkillPts() {
			return DB.skillPtsGiven[level];
		}
		
		//スキルポイント合計に対する必要レベル取得
		function requiredLevel() {
			var total = totalSkillPts();
			
			for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
				if(DB.skillPtsGiven[l] >= total)
					return l;
			}
			return NaN;
		}
		
		//レベルによる必要経験値
		function requiredExp(level) {
			return DB.expRequired[level];
		}
		
		//不足経験値
		function requiredExpRemain() {
			var required = requiredLevel();
			if(required <= level) return 0;
			var remain = requiredExp(required) - requiredExp(level);
			return remain;
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
		//おもさ      : weight
		function totalStatus(status) {
			//スキルラインデータの各スキルから上記プロパティを調べ合計する
			if(baseStatus === null)
				return NaN;

			var total = baseStatus[status];
			var skills;
			for(var skillLine in DB.skillLines) {
				skills = DB.skillLines[skillLine].skills;
				for(var i = 0; i < skills.length; i++) {
					if(skillPts[skillLine] < skills[i].pt)
						break;
					
					if(skills[i][status])
						total += skills[i][status];
				}
			}
			
			return total;
		}

		//現在のレベルを取得スキルに対する必要レベルにそろえる
		function bringUpLevelToRequired () {
			if(getLevel() < requiredLevel())
				updateLevel(requiredLevel());
		}

		function serialize() {
			var serial = '';
			var toByte = String.fromCharCode;

			serial += toByte(getLevel());

			for(var skillLine in DB.skillLines) {
				serial += toByte(getSkillPt(skillLine));
			}

			return serial;
		}
		function deserialize(serial) {
			var cur = 0;
			var getData = function() {
				return serial.charCodeAt(cur++);
			};

			if(serial.length < 1 + DB.skillLines.length)
				return;

			updateLevel(getData());

			for(var skillLine in DB.skillLines) {
				updateSkillPt(skillLine, getData());
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
			totalSkillPts: totalSkillPts,
			clearAllSkills: clearAllSkills,
			maxSkillPts: maxSkillPts,
			requiredLevel: requiredLevel,
			requiredExp: requiredExp,
			requiredExpRemain: requiredExpRemain,
			totalStatus: totalStatus,
			bringUpLevelToRequired: bringUpLevelToRequired,
			serialize: serialize,
			deserialize: deserialize,

			//定数
			SKILL_PTS_MIN: SKILL_PTS_MIN,
			SKILL_PTS_MAX: SKILL_PTS_MAX,
			LEVEL_MIN: LEVEL_MIN,
			LEVEL_MAX: LEVEL_MAX
		};
	})();

	var SimulatorUI = (function() {
		var CLASSNAME_SKILL_ENABLED = 'enabled';
		var CLASSNAME_ERROR = 'error';
		
		var sim = Simulator;

		function refreshAll() {
			refreshCharacterInfo();
			for(var skillLine in DB.skillLines) {
				refreshSkillList(skillLine);
			}
			refreshTotalStatus();
			refreshControls();
			refreshSaveUrl();
		}
		
		function refreshCharacterInfo() {
			var currentLevel = sim.getLevel();
			var requiredLevel = sim.requiredLevel();
			
			//見出し中のレベル数値
			$('#anlucea-data .lv_h2').text(currentLevel);
			var $levelH2 = $('#anlucea-data h2');

			//必要経験値
			$('#anlucea-data .exp').text(numToFormedStr(sim.requiredExp(currentLevel)));
			
			//スキルポイント 残り / 最大値
			var maxSkillPts = sim.maxSkillPts();
			var remainingSkillPts = maxSkillPts - sim.totalSkillPts();
			var $skillPtsText = $('#anlucea-data .pts');
			$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
			
			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			
			$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
			$('#anlucea-data .error').toggle(isLevelError);
			if(isLevelError) {
				$('#anlucea-data .req_lv').text(numToFormedStr(requiredLevel));
				$('#anlucea-data .exp_remain').text(numToFormedStr(sim.requiredExpRemain()));
			}
		}

		function refreshTotalStatus() {
			var statusArray = 'maxhp,maxmp,pow,def,magic,heal,spd,dex,charm,weight'.split(',');

			var $cont = $('#anlucea-data .status_info dl');
			var status;

			for(var i = 0; i < statusArray.length; i++) {
				status = statusArray[i];
				$cont.find('.' + status).text(sim.totalStatus(status));
			}
		}
		
		function refreshSkillList(skillLine) {
			$('tr[class^=' + skillLine + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
			var skillPt = sim.getSkillPt(skillLine);
			var skills = DB.skillLines[skillLine].skills;
			for(var s = 0; s < skills.length; s++) {
				if(skillPt < skills[s].pt)
					break;
				
				$('.' + skillLine + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
			}
			$('.' + skillLine + ' .skill_total').text(skillPt);
		}
		
		function refreshControls() {
			$('#anlucea-data .lv_select>select').val(sim.getLevel());
			
			for(var skillLine in DB.skillLines) {
				$('#anlucea-data .' + skillLine + ' .ptspinner').spinner('value', sim.getSkillPt(skillLine));
			}
		}

		function refreshSaveUrl() {
			var url = makeCurrentUrl();
			
			$('#url_text').val(url);
			
			var params = {
				text: 'DQ10 アンルシアのスキル構成:',
				hashtags: 'DQ10, dq10_skillsim',
				url: url,
				original_referer: window.location.href,
				tw_p: 'tweetbutton'
			};
			$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
		}
		
		function refreshUrlBar() {
			if(window.history && window.history.pushState) {
				var url = makeCurrentUrl();
				history.pushState(url, null, url);
			}
		}

		function makeCurrentUrl() {
			return window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(sim.serialize());

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
			//レベル選択セレクトボックス項目設定
			function() {
				var $select = $('#anlucea-data .lv_select>select');
				var skillPtsGiven;

				for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
					skillPtsGiven = DB.skillPtsGiven[i].toString();
					if(skillPtsGiven == 'NaN')
						skillPtsGiven = '-';
					$select.append($("<option />").val(i).text(i.toString() + ' (' + skillPtsGiven + ')'));
				}

				$select.change(function() {
					sim.updateLevel($(this).val());
					refreshCharacterInfo();
					refreshTotalStatus();
					refreshUrlBar();
				});
			},
			
			//スピンボタン設定
			function() {
				var $spinner = $('.ptspinner');

				$spinner.spinner({
					min: sim.SKILL_PTS_MIN,
					max: sim.SKILL_PTS_MAX,
					spin: function (e, ui) {
						var skillLine = getCurrentSkillLine(this);

						var succeeded = sim.updateSkillPt(skillLine, parseInt(ui.value, 10));

						if(succeeded) {
							refreshSkillList(skillLine);
							refreshCharacterInfo();
							refreshTotalStatus();
							e.stopPropagation();
						} else {
							return false;
						}
					},
					change: function (e, ui) {
						var skillLine = getCurrentSkillLine(this);
						var newValue = $(this).val();
						var oldValue = sim.getSkillPt(skillLine);

						if(isNaN(newValue)) {
							$(this).val(oldValue);
							return false;
						}
						
						newValue = parseInt(newValue, 10);
						if(newValue == oldValue)
							return false;

						var succeeded = sim.updateSkillPt(skillLine, newValue);

						if(succeeded) {
							refreshSkillList(skillLine);
							refreshCharacterInfo();
							refreshTotalStatus();
							refreshUrlBar();
						} else {
							$(this).val(oldValue);
							return false;
						}
					},
					stop: function (e, ui) {
						refreshUrlBar();
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

			//リセットボタン設定
			function() {
				$('.reset').button({
					icons: { primary: 'ui-icon-refresh' },
					text: false
				}).click(function (e) {
					var skillLine = getCurrentSkillLine(this);

					sim.updateSkillPt(skillLine, 0);
					$('.ptspinner').val(0);
					refreshSkillList(skillLine);
					refreshCharacterInfo();
					refreshTotalStatus();
					refreshUrlBar();
				});
			},
			
			//スキルテーブル項目クリック時
			function() {
				$('.skill_table tr[class]').click(function() {
					var skillLine = getCurrentSkillLine(this);
					var skillIndex = parseInt($(this).attr('class').replace(skillLine + '_', ''), 10);

					var requiredPt = DB.skillLines[skillLine].skills[skillIndex].pt;
					sim.updateSkillPt(skillLine, requiredPt);
					$('.' + skillLine + ' .ptspinner').spinner('value', sim.getSkillPt(skillLine));

					refreshSkillList(skillLine);
					refreshCharacterInfo();
					refreshTotalStatus();
					refreshUrlBar();
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
			
			//全スキルをリセット
			function() {
				$('#clearallskills>button').button({
					icons: { primary: 'ui-icon-refresh' },
				}).click(function(e) {
					if(!window.confirm('すべてのスキルを振りなおします。\n（レベルは変わりません）'))
						return;
					
					sim.clearAllSkills();
					refreshAll();
					refreshUrlBar();
				});
			},
			
			//ナビゲーションボタン
			/*
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
			*/

			//レベルを取得スキルに応じて引き上げ
			function() {
				$('#bringUpLevel>button').button({
					icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				}).click(function(e) {
					if(!window.confirm('レベルを現在の取得スキルに必要なところまで引き上げます。'))
						return;
					
					sim.bringUpLevelToRequired();
					refreshCharacterInfo();
					refreshControls();
					refreshTotalStatus();
					refreshUrlBar();
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

	//Base64 URI safe
	//[^\x00-\xFF]な文字しか来ない前提
	var Base64 = (function(global) {
		var btoa = function(b) {
			return global.btoa(b)
				.replace(/[+\/]/g, function(m0) {return m0 == '+' ? '-' : '_';})
				.replace(/=/g, '');
		};

		var atob = function(a) {
			a = a.replace(/[-_]/g, function(m0) {return m0 == '-' ? '+' : '/';});
			if(a.length % 4 == 1) a += 'A';

			return global.atob(a);
		};

		function isValid(a) {
			return (/^[A-Za-z0-9-_]+$/).test(a);
		}

		//API
		return {
			btoa: btoa,
			atob: atob,
			isValid: isValid
		};
	})(window);

	//ロード時
	$(function($) {
		function deserialize() {
			var query = window.location.search.substring(1);
			if(Base64.isValid(query)) {
				var serial = '';

				try {
					serial = Base64.atob(query);
				} catch(e) {
				}
				
				if(serial.length >= 6) { //Lv 1 + skill 5
					Simulator.deserialize(serial);
				}
			}
		}
		
		var ui = SimulatorUI;
		
		$(window).on('popstate', function(e) {
			// 最初に開いた状態まで戻ったとき、クエリー文字列がなかったらリロードする
			if(!e.originalEvent.state && window.location.search.length === 0)
				window.location.reload();
			
			deserialize();
			ui.refreshAll();
		});
		
		$dbLoad.done(function(data) {
			Simulator.initialize();

			deserialize();
			ui.setup();
		});
	});

})(jQuery);
