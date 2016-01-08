/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />

/// <reference path="typings/dq10skill.d.ts" />

/// <reference path="dq10skill-monster-monster.ts" />
/// <reference path="dq10skill-monster-command.ts" />

declare var Base64: any;

namespace Dq10.SkillSimulator {
	export var Simulator;
	export var MonsterDB: MonsterSimulatorDB;

	export const MONSTER_MAX = 8;
	
	export const BASIC_SKILL_COUNT = 3;
	export const ADDITIONAL_SKILL_MAX = 2;
	export const BADGE_COUNT = 4;

	//ビット数定義
	export const BITS_MONSTER_TYPE = 6;
	export const BITS_LEVEL = 8;
	export const BITS_RESTART_COUNT = 4;
	export const BITS_SKILL = 6;
	export const BITS_ADDITIONAL_SKILL = 6;
	export const BITS_BADGE = 10;
	export const BITS_NATSUKI = 4;
	export const bitDataLength =
		BITS_MONSTER_TYPE +
		BITS_LEVEL +
		BITS_RESTART_COUNT +
		BITS_SKILL * (BASIC_SKILL_COUNT + ADDITIONAL_SKILL_MAX) +
		BITS_ADDITIONAL_SKILL * ADDITIONAL_SKILL_MAX; // +
		//BITS_BADGE * BADGE_COUNT;
	
(function($: JQueryStatic) {
	"use strict";

	//データJSONを格納する変数
	var DB: MonsterSimulatorDB;
	var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-monster-data.json');
	var $dbLoad = $.getJSON(DATA_JSON_URI, (data) => {
		DB = data;
		MonsterDB = DB;
	});
	
	var Simulator = (function() {
		//パラメータ格納用
		var monsters: MonsterUnit[] = [];
		
		//モンスターID管理
		var lastId = 0;

		/* メソッド */

		//モンスター追加
		function addMonster (monsterType: string, index: number) {
			if(monsters.length >= MONSTER_MAX)
				return null;

			var newMonster = new MonsterUnit(monsterType, lastId++);
			if(index === undefined)
				monsters.push(newMonster);
			else
				monsters.splice(index, 0, newMonster);
			return newMonster;
		}

		//IDからモンスター取得
		function getMonster(monsterId: string) {
			return monsters[indexOf(monsterId)];
		}

		//指定IDのモンスター削除
		function deleteMonster(monsterId: string): any {
			var i = indexOf(monsterId);
			if(i !== null)
				return monsters.splice(i, 1)[0];
			else
				return false;
		}

		//指定IDのモンスターをひとつ下に並び替える
		function movedownMonster(monsterId: string) {
			var i = indexOf(monsterId);
			if(i > monsters.length) return;

			monsters.splice(i, 2, monsters[i + 1], monsters[i]);
		}

		//指定IDのモンスターをひとつ上に並び替える
		function moveupMonster(monsterId: string) {
			var i = indexOf(monsterId);
			if(i < 0) return;
			
			monsters.splice(i - 1, 2, monsters[i], monsters[i - 1]);
		}

		function indexOf(monsterId: string) {
			for(var i = 0; i < monsters.length; i++) {
				if(monsters[i].id == monsterId) return i;
			}
			return null;
		}

		function generateQueryString() {
			var query = [];
			monsters.forEach((monster) => {
				query.push(Base64forBit.encode(monster.serialize()));
				query.push(Base64.encode(monster.indivName, true));
			});

			return query.join(';');
		}

		function applyQueryString(queryString: string) {
			var query = queryString.split(';');
			while(query.length > 0) {
				var newMonster = MonsterUnit.deserialize(Base64forBit.decode(query.shift()), lastId++);
				newMonster.updateIndividualName(Base64.decode(query.shift()));
				monsters.push(newMonster);
			}
		}

		function validateQueryString(queryString: string) {
			if(!queryString.match(/^[A-Za-z0-9-_;]+$/))
				return false;

			var query = queryString.split(';');
			if(query.length % 2 == 1)
				return false;

			return query.every((q) => {
				return (q.length * Base64forBit.BITS_ENCODE >= bitDataLength);
			});
		}

		//API
		return {
			//メソッド
			addMonster: addMonster,
			getMonster: getMonster,
			deleteMonster: deleteMonster,
			movedownMonster: movedownMonster,
			moveupMonster: moveupMonster,
			indexOf: indexOf,
			generateQueryString: generateQueryString,
			applyQueryString: applyQueryString,
			validateQueryString: validateQueryString,

			//プロパティ
			monsters: monsters
		};
	})();
	Dq10.SkillSimulator.Simulator = Simulator;

	/* UI */
	var SimulatorUI = (function() {
		var CLASSNAME_SKILL_ENABLED = 'enabled';
		var CLASSNAME_ERROR = 'error';
		
		var sim = Simulator;
		var com = new SimulatorCommandManager();

		//モンスターのエントリ追加
		function drawMonsterEntry (monster: MonsterUnit) {
			var $ent = $('#monster_dummy').clone()
				.attr('id', monster.id)
				.css('display', 'block');
			$ent.find('.monstertype').text(monster.data.name);
			$ent.find('[id$=-dummy]').each((i, elem) => {
				var dummyId = $(elem).attr('id');
				var newId = dummyId.replace('-dummy', '-' + monster.id);

				$(elem).attr('id', newId);
				$ent.find('label[for=' + dummyId + ']').attr('for', newId);
			});
			$ent.find('.indiv_name input').val(monster.indivName);

			var skillLine, $table, $skillContainer = $ent.find('.skill_tables');

			monster.data.skillLines.forEach((skillLine) => {
				$table = drawSkillTable(skillLine);
				$skillContainer.append($table);
			});
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				skillLine = 'additional' + s.toString();
				$table = drawSkillTable(skillLine);

				if(monster.restartCount < s + 1 || monster.getAdditionalSkill(s) === null)
					$table.hide();

				$skillContainer.append($table);
			}

			return $ent;
		}
		function drawSkillTable(skillLineId: string) {
			var $table = $('<table />').addClass(skillLineId).addClass('skill_table');
			$table.append('<caption><span class="skill_line_name">' +
				DB.skillLines[skillLineId].name +
				'</span>: <span class="skill_total">0</span></caption>')
				.append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');

			DB.skillLines[skillLineId].skills.forEach((skill, s) => {
				$('<tr />').addClass([skillLineId, s].join('_'))
					.append('<td class="skill_pt">' + skill.pt + '</td>')
					.append('<td class="skill_name">' + skill.name + '</td>')
					.appendTo($table);
			});

			return $table;
		}

		function refreshEntry(monsterId: string) {
			refreshAdditionalSkillSelector(monsterId);
			refreshAdditionalSkill(monsterId);
			refreshMonsterInfo(monsterId);
			Object.keys(DB.skillLines).forEach((skillLineId) => 
				refreshSkillList(monsterId, skillLineId)
			);
			refreshTotalStatus(monsterId);
			refreshControls(monsterId);
			refreshBadgeButtons(monsterId);
			refreshSaveUrl();
		}

		function refreshAll() {
			sim.monsters.forEach((monster) => refreshEntry(monster.id));
		}

		function refreshMonsterInfo(monsterId: string) {
			var monster = sim.getMonster(monsterId);
			var currentLevel = monster.getLevel();
			var requiredLevel = monster.requiredLevel();
			
			//見出し中のレベル数値
			$(`#${monsterId} .lv_h2`).text(currentLevel);
			if(monster.getRestartCount() > 0)
				$(`#${monsterId} .lv_h2`).append('<small> + ' + monster.getRestartCount() + '</small>');

			var $levelH2 = $(`#${monsterId} h2`);
			
			//必要経験値
			$(`#${monsterId} .exp`).text(numToFormedStr(monster.requiredExp(currentLevel)));
			var additionalExp = monster.additionalExp();
			if(additionalExp > 0)
				$(`#${monsterId} .exp`).append('<small> + ' + numToFormedStr(additionalExp) + '</small>');

			//スキルポイント 残り / 最大値
			var maxSkillPts = monster.maxSkillPts();
			var restartSkillPts = monster.getRestartSkillPt();
			var natsukiSkillPts = monster.getNatsukiSkillPts();
			var remainingSkillPts = maxSkillPts + restartSkillPts + natsukiSkillPts - monster.totalSkillPts();
			var $skillPtsText = $(`#${monsterId} .pts`);
			$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
			if(restartSkillPts > 0)
				$skillPtsText.append('<small> +' + restartSkillPts + '</small>');
			if(natsukiSkillPts > 0)
				$skillPtsText.append('<small> +' + natsukiSkillPts + '</small>');
			
			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			
			$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
			$(`#${monsterId} .error`).toggle(isLevelError);
			if(isLevelError) {
				$(`#${monsterId} .req_lv`).text(numToFormedStr(requiredLevel));
				$(`#${monsterId} .exp_remain`).text(numToFormedStr(monster.requiredExpRemain()));
			}
		}
		
		function refreshSkillList(monsterId: string, skillLineId: string) {
			$(`#${monsterId} tr[class^=${skillLineId}_]`).removeClass(CLASSNAME_SKILL_ENABLED); //クリア
			var monster = sim.getMonster(monsterId);

			var skillPt = monster.getSkillPt(skillLineId);
			var skills = DB.skillLines[skillLineId].skills;
			DB.skillLines[skillLineId].skills.some((skill, s) => {
				if(skillPt < skill.pt)
					return true;
				
				$(`#${monsterId} .${skillLineId}_${s}`).addClass(CLASSNAME_SKILL_ENABLED);
				return false;
			});
			$(`#${monsterId} .${skillLineId} .skill_total`).text(skillPt);
		}
		
		function refreshControls(monsterId: string) {
			var monster = sim.getMonster(monsterId);

			$(`#${monsterId} .lv_select>select`).val(monster.getLevel());
			$(`#${monsterId} .restart_count`).val(monster.getRestartCount());
			
			Object.keys(monster.skillPts).forEach((skillLineId) => {
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));
			});
			
			$(`#${monsterId} .natsuki-selector>select`).val(monster.getNatsuki());
		}
		
		function refreshSaveUrl() {
			var queryString = sim.generateQueryString();
			if(queryString.length === 0) {
				$('#url_text').val(url);
				$('#tw-saveurl').attr('href', '');
				return;
			}

			var url = window.location.href.replace(window.location.search, "") + '?' + queryString;
			$('#url_text').val(url);
			
			var params = {
				text: 'DQ10 仲間モンスターのスキル構成:',
				hashtags: 'DQ10, dq10_skillsim',
				url: url,
				original_referer: window.location.href,
				tw_p: 'tweetbutton'
			};
			$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
		}

		function refreshAdditionalSkillSelector(monsterId: string) {
			var monster = sim.getMonster(monsterId);
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				$(`#${monsterId} .additional_skill_selector-${s}`).toggle(monster.restartCount > s);
			}

			$(`#${monsterId} .additional_skill_selector select`).empty();

			if(monster.restartCount >= 1) {
				DB.additionalSkillLines.forEach((additionalSkillData) => {
					var skillData = DB.skillLines[additionalSkillData.name];
					if(monster.restartCount >= additionalSkillData.restartCount &&
					   (!additionalSkillData.occupied ||
					   additionalSkillData.occupied.indexOf(monster.monsterType) >= 0)) {
						$(`#${monsterId} .additional_skill_selector select`).append(
							$('<option />').val(additionalSkillData.name).text(skillData.name)
						);
					}
				});
			}

			for(s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				$(`#${monsterId} .additional_skill_selector-${s} select`).val(monster.getAdditionalSkill(s));
			}
		}

		function refreshAdditionalSkill(monsterId: string) {
			var monster = sim.getMonster(monsterId);
			var $table;

			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				$table = $(`#${monsterId} .additional${s}`);
				if(monster.restartCount >= s + 1 && monster.getAdditionalSkill(s) !== null) {
					refreshAdditionalSkillTable($table, monster.getAdditionalSkill(s));
					$table.show();
				} else {
					$table.hide();
				}
			}

			function refreshAdditionalSkillTable($table, newSkillLine: string) {
				var data = DB.skillLines[newSkillLine];
				var tableClass = $table.attr('class').split(' ')[0];

				$table.find('caption .skill_line_name').text(data.name);

				data.skills.forEach((skill, i) =>  {
					var $tr = $table.find(`tr.${tableClass}_${i}`);

					var hintText = getHintText(skill);
					$tr.attr('title', hintText);

					$tr.children('.skill_pt').text(skill.pt);
					$tr.children('.skill_name').text(skill.name);
				});
			}
		}

		function refreshTotalStatus(monsterId: string) {
			var monster = sim.getMonster(monsterId);
			var statusArray = 'maxhp,maxmp,atk,pow,def,magic,heal,spd,dex,charm,weight'.split(',');

			var $cont = $(`#${monsterId} .status_info dl`);
			statusArray.forEach((status) => {
				$cont.find('.' + status).text(monster.getTotalStatus(status));
			});
		}

		function drawBadgeButton(monsterId: string, badgeIndex: number) {
			var monster = sim.getMonster(monsterId);

			var $badgeButton = $(`#append-badge${badgeIndex}-${monsterId}`);
			var $badgeButtonCont = $badgeButton.closest('li');

			var badgeId = monster.badgeEquip[badgeIndex];
			var badge = badgeId ? DB.badges[badgeId] : null;

			var buttonText = '';
			var buttonHintText = '';

			if(badge) {
				buttonText = badgeId + ' ' + badge.name + '・' + DB.badgerarity[badge.rarity];
				buttonHintText = BadgeSelector.getFeatureCache(badgeId).join("\n");
			} else {
				if(badgeIndex == monster.badgeEquip.length - 1)
					buttonText = 'スペシャルバッジ';
				else
					buttonText = 'バッジ' + (badgeIndex + 1).toString();
			}
			$badgeButton.text(buttonText).attr('title', buttonHintText);

			var rarityClass = badge === null ? 'blank' : badge.rarity;

			$badgeButtonCont.toggleClass('blank', rarityClass == 'blank');
			Object.keys(DB.badgerarity).forEach((rarity) => {
				$badgeButtonCont.toggleClass(rarity, rarityClass == rarity);
			});
		}

		function refreshBadgeButtons(monsterId: string) {
			for(var i = 0; i < BADGE_COUNT; i++)
				drawBadgeButton(monsterId, i);
		}

		function getCurrentMonsterId(currentNode: HTMLElement) {
			return $(currentNode).parents('.monster_ent').attr('id');
		}

		function getCurrentSkillLine(currentNode: HTMLElement) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		function getHintText(skill: Skill) {
			var hintText = skill.desc || '';
			if((skill.mp !== null) && (skill.mp !== undefined))
				hintText += `\n（消費MP: ${skill.mp}）`;
			if((skill.charge !== null) && (skill.charge !== undefined))
				hintText += `\n（チャージ: ${skill.charge}秒）`;
			if(skill.gold)
				hintText += `\n（${skill.gold}G）`;

			return hintText;
		}

		function setupEntry(monsterId: string) {
			var $ent = $('#' + monsterId);

			//レベル選択セレクトボックス項目設定
			var $select = $ent.find('.lv_select>select');
			for(var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
				$select.append($("<option />").val(i).text(`${i} (${DB.skillPtsGiven[i]})`));
			}
			//レベル選択セレクトボックス変更時
			$select.change(function() {
				var monsterId = getCurrentMonsterId(this);
				sim.getMonster(monsterId).updateLevel($(this).val());
				refreshMonsterInfo(monsterId);
				//refreshSaveUrl();
			});

			//レベル転生回数スピンボタン設定
			var $spinner = $ent.find('.restart_count');
			$spinner.spinner({
				min: DB.consts.restart.min,
				max: DB.consts.restart.max,
				spin: function (e, ui) {
					var monsterId = getCurrentMonsterId(this);
					var monster = sim.getMonster(monsterId);

					if(monster.updateRestartCount(ui.value)) {
						refreshAdditionalSkillSelector(monsterId);
						refreshAdditionalSkill(monsterId);
						refreshMonsterInfo(monsterId);
						refreshTotalStatus(monsterId);
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var monsterId = getCurrentMonsterId(this);
					var monster = sim.getMonster(monsterId);
					
					if(isNaN($(this).val())) {
						$(this).val(monster.getRestartCount());
						return false;
					}
					if(monster.updateRestartCount(parseInt($(this).val(), 10))) {
						refreshAdditionalSkillSelector(monsterId);
						refreshAdditionalSkill(monsterId);
						refreshMonsterInfo(monsterId);
						refreshTotalStatus(monsterId);
						refreshSaveUrl();
					} else {
						$(this).val(monster.getRestartCount());
						return false;
					}
				},
				stop: function (e, ui) {
					refreshSaveUrl();
				}
			});

			//スピンボタン設定
			$spinner = $ent.find('.ptspinner');
			$spinner.spinner({
				min: DB.consts.skillPts.min,
				max: DB.consts.skillPts.max,
				spin: function (e, ui) {
					var monsterId = getCurrentMonsterId(this);
					var skillLineId = getCurrentSkillLine(this);
					
					if(sim.getMonster(monsterId).updateSkillPt(skillLineId, ui.value)) {
						refreshSkillList(monsterId, skillLineId);
						refreshMonsterInfo(monsterId);
						refreshTotalStatus(monsterId);
						e.stopPropagation();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var monsterId = getCurrentMonsterId(this);
					var skillLineId = getCurrentSkillLine(this);
					var monster = sim.getMonster(monsterId);

					if(isNaN($(this).val())) {
						$(this).val(monster.getSkillPt(skillLineId));
						return false;
					}
					if(monster.updateSkillPt(skillLineId, parseInt($(this).val(), 10))) {
						refreshSkillList(monsterId, skillLineId);
						refreshMonsterInfo(monsterId);
						refreshTotalStatus(monsterId);
						refreshSaveUrl();
					} else {
						$(this).val(monster.getSkillPt(skillLineId));
						return false;
					}
				},
				stop: function (e, ui) {
					refreshSaveUrl();
				}
			});
			//テキストボックスクリック時数値を選択状態に
			$spinner.click(function(e) {
				$(this).select();
			});
			//テキストボックスでEnter押下時更新して選択状態に
			$spinner.keypress(function(e) {
				if(e.which == 13) {
					$('#url_text').focus();
					$(this).focus().select();
				}
			});

			//リセットボタン設定
			$ent.find('.reset').button({
				icons: { primary: 'ui-icon-refresh' },
				text: false
			}).click(function (e) {
				var monsterId = getCurrentMonsterId(this);
				var skillLineId = getCurrentSkillLine(this);
				var monster = sim.getMonster(monsterId);
				
				monster.updateSkillPt(skillLineId, 0);
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));
				refreshSkillList(monsterId, skillLineId);
				refreshMonsterInfo(monsterId);
				refreshTotalStatus(monsterId);
				refreshSaveUrl();
			});
			
			//スキルテーブル項目クリック時
			$ent.find('.skill_table tr[class]').click(function() {
				var monsterId = getCurrentMonsterId(this);
				var skillLineId = getCurrentSkillLine(this);
				var skillIndex = parseInt($(this).attr('class').replace(skillLineId + '_', ''), 10);
				var monster = sim.getMonster(monsterId);

				var requiredPt = DB.skillLines[skillLineId].skills[skillIndex].pt;
				
				monster.updateSkillPt(skillLineId, requiredPt);
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));
				
				refreshSkillList(monsterId, skillLineId);
				refreshMonsterInfo(monsterId);
				refreshTotalStatus(monsterId);
				refreshSaveUrl();
			});

			//おりたたむ・ひろげるボタン設定
			var HEIGHT_FOLDED = '4.8em';
			var HEIGHT_UNFOLDED = $ent.height() + 'px';
			var CLASSNAME_FOLDED = 'folded';

			$ent.find('.toggle_ent').button({
				icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				text: false,
				label: 'おりたたむ'
			}).click(function() {
				var $entry = $(this).parents('.monster_ent');
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

			//ヒントテキスト設定
			Object.keys(DB.skillLines).forEach((skillLineId) => {
				DB.skillLines[skillLineId].skills.forEach((skill, i) => {
					var hintText = getHintText(skill);
					$(`.${skillLineId}_${i}`).attr('title', hintText);
				})
			})

			//削除ボタン
			$ent.find('.delete_entry').button({
				icons: { primary: 'ui-icon-close' },
				text: false
			}).click(function (e) {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);

				var additionalLevel = '';
				if(monster.getRestartCount() > 0)
					additionalLevel = `(+${monster.getRestartCount()})`;

				var message = monster.data.name +
					' Lv' + monster.getLevel().toString() + additionalLevel +
					`「${monster.getIndividualName()}」を削除します。` +
					'\nよろしいですか？';
				if(!window.confirm(message)) return;

				com.deleteMonster(monsterId);
			});

			//下へボタン
			$ent.find('.movedown').button({
				icons: { primary: 'ui-icon-triangle-1-s' },
				text: false
			}).click(function (e) {
				var monsterId = getCurrentMonsterId(this);
				var $ent = $('#' + monsterId);

				if($ent.next().length === 0) return;

				var zIndex = $ent.css('z-index');
				var pos = $ent.position();

				$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
				$ent.animate({top: $ent.next().position().top + $ent.next().height()}, function() {
					$ent.insertAfter($ent.next());
					$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
					sim.movedownMonster(monsterId);
					refreshSaveUrl();
				});
			});
			//上へボタン
			$ent.find('.moveup').button({
				icons: { primary: 'ui-icon-triangle-1-n' },
				text: false
			}).click(function (e) {
				var monsterId = getCurrentMonsterId(this);
				var $ent = $('#' + monsterId);

				if($ent.prev().length === 0) return;

				var zIndex = $ent.css('z-index');
				var pos = $ent.position();

				$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
				$ent.animate({top: $ent.prev().position().top}, function() {
					$ent.insertBefore($ent.prev());
					$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
					sim.moveupMonster(monsterId);
					refreshSaveUrl();
				});
			});

			//個体名テキストボックス
			$ent.find('.indiv_name input').change(function(e) {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);

				monster.updateIndividualName($(this).val());
				refreshSaveUrl();
			});

			//転生追加スキルセレクトボックス
			$ent.find('.additional_skill_selector select').change(function(e) {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);

				var selectorId = parseInt($(this).attr('id').match(/^select-additional(\d+)-/)[1]);
				if(monster.updateAdditionalSkill(selectorId, $(this).val())) {
					refreshAdditionalSkill(monsterId);
					refreshMonsterInfo(monsterId);
					refreshTotalStatus(monsterId);
					refreshSaveUrl();
				} else {
					$(this).val(monster.getAdditionalSkill(selectorId));
					return false;
				}
			});

			//バッジ選択ボタン
			$ent.find('.badge-button-container a').click(function(e) {
				var monsterId = getCurrentMonsterId(this);
				var badgeIndex = parseInt($(this).attr('id').match(/^append-badge(\d+)-/)[1], 10);

				BadgeSelector.setCurrentMonster(sim.getMonster(monsterId), badgeIndex);
				BadgeSelector.show((badgeId) => {
					sim.getMonster(monsterId).badgeEquip[badgeIndex] = badgeId;
					drawBadgeButton(monsterId, badgeIndex);
					refreshTotalStatus(monsterId);
					refreshSaveUrl();
				});
			});

			//なつき度選択セレクトボックス
			var $natsukiSelect = $ent.find('.natsuki-selector>select');
			DB.natsukiPts.forEach((natukiData, i) => {
				$natsukiSelect.append($("<option />").val(i).text(natukiData.natsukido.toString() + '(' + natukiData.pt.toString() + ')'));
			});
			//なつき度選択セレクトボックス変更時
			$natsukiSelect.change(function() {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);

				monster.updateNatsuki(parseInt($(this).val()));
				refreshMonsterInfo(monsterId);
				refreshSaveUrl();
			});
		}

		function setupConsole() {
			//URLテキストボックスクリック時
			$('#url_text').click(function() {
				$(this).select();
			});

			//保存用URLツイートボタン設定
			$('#tw-saveurl').button().click(function(e) {
				if($(this).attr('href') === '') return false;

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
				var windowParam = $.map(windowParams, (val, key) => key + '=' + val).join(',');
				window.open(this.href, null, windowParam);
				
				return false;
			});

			//すべておりたたむ・すべてひろげるボタン
			var CLASSNAME_FOLDED = 'folded';
			$('#fold-all').click(function(e) {
				$('.monster_ent:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});
			$('#unfold-all').click(function(e) {
				$('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});

			//レベル一括設定
			//セレクトボックス初期化
			var $select = $('#setalllevel>select');
			for(var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
				$select.append($("<option />").val(i).text(i.toString()));
			}
			$select.val(DB.consts.level.max);
			
			$('#setalllevel>button').button().click(function(e) {
				sim.monsters.forEach((monster) => monster.updateLevel($select.val()));
				refreshAll();
			});

			$('.appendbuttons a').click(function(e) {
				var monsterType = $(this).attr('id').replace('append-', '');
				com.addMonster(monsterType);
			});
		}

		function setupEvents() {
			com.on('MonsterAppended', (monster, index) => {
				$('#initial-instruction').hide();

				$('#monsters').append(drawMonsterEntry(monster));
				setupEntry(monster.id);
				refreshEntry(monster.id);

				$('#' + monster.id + ' .indiv_name input').focus().select();
			});
			com.on('MonsterRemoved', (monster) => {
				$('#' + monster.id).remove();

				refreshSaveUrl();

				if(sim.monsters.length === 0)
					$('#initial-instruction').show();
			});
		}

		function setupAll() {
			setupConsole();
			setupEvents();
			BadgeSelector.setup();

			$('#monsters').empty();

			if(sim.monsters.length > 0)
				$('#initial-instruction').hide();

			sim.monsters.forEach((monster) => $('#monsters').append(drawMonsterEntry(monster)));
			setupEntry('monsters');

			refreshAll();
		}

		//数値を3桁区切りに整形
		function numToFormedStr(num: number) {
			if(isNaN(num)) return 'N/A';
			return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
		}

		//バッジ選択ダイアログ
		var BadgeSelector = (function() {
			var $dialog;
			var $maskScreen;

			var dialogResult = false;
			var selectedBadgeId: string = null;
			var closingCallback: (badgeId: string) => void;

			//バッジ効果リストのキャッシュ
			var featureCache: {[badgeId: string]: string[]} = {};

			//ソート順の昇降を保持
			var sortByIdDesc = false;
			var sortByKanaDesc = false;

			//モンスターデータを一部保持
			var status: {[statusType: string]: number} = {};
			var currentBadgeId: string = null;
			var badgeEquip: string[] = [];

			//検索機能
			var BadgeSearch = (function() {
				var univIds: string[] = []; //全集合

				//検索フィルター状態保持変数
				interface SearchFilter {
					filterType: string;
					searchKey: string;
				};
				var search: SearchFilter[] = [];
				
				//検索キャッシュ
				var searchCache = {};

				function toggleSearch(filterType: string, searchKey: string) {
					var isTurningOn = true;

					search.some((filter, i) => {
						if(filter.filterType == filterType && filter.searchKey == searchKey) {
							isTurningOn = false;
							search.splice(i, 1);
							return true;
						}
						if((filterType == 'race' || filterType == 'rarity') && filter.filterType == filterType) {
							search.splice(i, 1);
							return true;
						}
					});
					
					if(isTurningOn)
						search.push({
							filterType: filterType,
							searchKey: searchKey
						});

					return isTurningOn;
				}

				function getIds() {
					return search.reduce((ids, filter) => {
						var cacheKey = filter.filterType + '_' + filter.searchKey;
						return arrayIntersect(ids, getSearchCache(cacheKey));
					}, getUnivIds());
				}

				function arrayIntersect(array1: string[], array2: string[]) {
					return array1.filter((val) => array2.indexOf(val) >= 0);
				}

				function getSearchCache(key: string) {
					if(searchCache[key])
						return searchCache[key];

					var _s = key.split('_'),
						filterType = _s[0],
						searchKey = _s[1];

					var filterFunc: (badge: Badge) => boolean;
					switch(filterType) {
						case 'race':
							filterFunc = (badge) => badge.race == searchKey;
							break;
						case 'rarity':
							filterFunc = (badge) => badge.rarity == searchKey;
							break;
						case 'feature':
							filterFunc = (badge) => badge[searchKey] !== undefined;
							break;
						default:
							throw 'UnknownFilterType';
					}

					return getUnivIds().filter((id) => filterFunc(DB.badges[id]));
				}

				function getUnivIds() {
					if(univIds.length > 0)
						return univIds;

					univIds = Object.keys(DB.badges);
					return univIds;
				}

				function clear() {
					search = [];
				}

				return {
					toggleSearch: toggleSearch,
					getIds: getIds,
					clear: clear
				};
			})();

			function setup() {
				$dialog = $('#badge-selector');
				$maskScreen = $('#dark-screen');

				$maskScreen.click(function(e) {
					cancel();
				});

				//ヘッダー部ドラッグで画面移動可能
				$dialog.draggable({
					handle: '#badge-selector-header',
					cursor: 'move'
				});

				//バッジをはずすボタン
				$('#badge-selector-remove').click(function(e) {
					apply(null);
				}).hover(function(e) {
					clearBadgeInfo();
					refreshStatusAfter(null);
				});

				//バッジ設定ボタン
				$('#badge-selector-list a').click(function(e) {
					var badgeId = getBadgeId(this);
					apply(badgeId);
				}).hover(function(e) {
					var badgeId = getBadgeId(this);
					refreshBadgeInfo(badgeId);
					refreshStatusAfter(badgeId);
				});

				//バッジ検索ボタン
				$('#badge-search-buttons-race,' +
				  '#badge-search-buttons-rarity,' +
				  '#badge-search-buttons-feature').find('a').click(function(e) {
					var searchKey = $(this).attr('data-search-key');
					var filterType = $(this).attr('data-filter-type');

					var isTurningOn = BadgeSearch.toggleSearch(filterType, searchKey);
					toggleSearchButtons(this, isTurningOn, (filterType == 'race' || filterType == 'rarity'));

					filterButtons(BadgeSearch.getIds());

					if(isTurningOn && filterType == 'feature' && DB.badgefeature[searchKey]['type'] == 'int') {
						sortBadgeByFeatureValue(searchKey, true);
					}
				});

				//バッジソートボタン
				$('#badge-sort-badgeid').click(function(e) {
					sortBadgeById(sortByIdDesc);
					sortByIdDesc = !sortByIdDesc;
					sortByKanaDesc = false;
				});
				$('#badge-sort-kana').click(function(e) {
					sortBadgeByKana(sortByKanaDesc);
					sortByKanaDesc = !sortByKanaDesc;
					sortByIdDesc = false;
				});

				//検索クリアボタン
				$('#badge-search-clear').click(function(e) {
					clearFilter();
				});
			}

			function getBadgeId(elem: HTMLElement): string {
				if(elem.tagName.toUpperCase() == 'LI')
					elem = $(elem).find('a').get(0);

				if($(elem).attr('id') == 'badge-selector-remove')
					return null;
				else
					return $(elem).attr('data-badge-id');
			}

			function clearBadgeInfo() {
				$('#badge-selector-badge-id').text('');
				$('#badge-selector-badge-name').text('');
				$('#badge-selector-race').text('');
				$('#badge-selector-feature-list').empty();
			}

			function refreshBadgeInfo(badgeId: string) {
				var badge = DB.badges[badgeId];
				if(!badge) return;

				$('#badge-selector-badge-id').text(badgeId);

				var badgeName = badge.name + '・' + DB.badgerarity[badge.rarity];
				$('#badge-selector-badge-name').text(badgeName);

				var raceName;
				if(badge.race == 'special')
					raceName = 'スペシャルバッジ';
				else
					raceName = DB.badgerace[badge.race].name + '系';
				$('#badge-selector-race').text(raceName);

				var features = getFeatureCache(badgeId);

				var $featureList = $('#badge-selector-feature-list');
				$featureList.empty();
				features.forEach((feature) => $('<li>').text(feature).appendTo($featureList));
			}
			function getFeatureCache(badgeId: string) {
				if(featureCache[badgeId])
					return featureCache[badgeId];

				var badge = DB.badges[badgeId];

				var features: string[] = [];
				Object.keys(DB.badgefeature).forEach((f) => {
					var feature = DB.badgefeature[f];
					var val = badge[f];

					if(val) {
						switch(feature.type) {
							case 'int':
							case 'string':
								if(feature.format)
									features.push(feature.format.replace('@v', val));
								else
									features.push(feature.name + ' +' + val.toString());
								break;
							case 'array':
								features = features.concat(getFeatureArrayFromArray(feature.format, val));
								break;
							case 'hash':
								features = features.concat(getFeatureArrayFromHash(feature.format, val));
								break;
						}
					}
				});

				featureCache[badgeId] = features;
				return featureCache[badgeId];

				function getFeatureArrayFromArray(format: string, fromArray: string[]) {
					var retArray: string[] = [];

					fromArray.forEach((ent) => {
						var ret = format.replace('@v', ent);
						retArray.push(ret);
					});

					return retArray;
				}
				function getFeatureArrayFromHash(format: string, fromHash: {[key: string]: any}) {
					var retArray: string[] = [];

					Object.keys(fromHash).forEach((k) => {
						var v = fromHash[k];
						var ret = format.replace('@k', k).replace('@v', v);
						retArray.push(ret);
					});

					return retArray;
				}
			}

			var STATUS_ARRAY = 'atk,def,maxhp,maxmp,magic,heal,spd,dex,stylish,weight'.split(',');

			function setCurrentMonster(monster: MonsterUnit, badgeIndex: number) {
				STATUS_ARRAY.forEach((s) => {
					status[s] = monster.getTotalStatus(s);

					$('#badge-status-current-' + s).text(status[s]);
				});
				currentBadgeId = monster.badgeEquip[badgeIndex];

				refreshStatusAfter(null);
			}

			function refreshStatusAfter(badgeId: string) {
				var currentBadge: Badge = null;
				if(currentBadgeId !== null)
					currentBadge = DB.badges[currentBadgeId];
				var newBadge: Badge = null;
				if(badgeId !== null)
					newBadge = DB.badges[badgeId];

				STATUS_ARRAY.forEach((s) => {
					var before = status[s];

					var after = before;
					if(currentBadge !== null && currentBadge[s])
						after -= currentBadge[s];
					if(newBadge !== null && newBadge[s])
						after += newBadge[s];

					$('#badge-status-after-' + s).text(before == after ? '' : after)
						.toggleClass('badge-status-plus', before < after)
						.toggleClass('badge-status-minus', before > after);
				});
			}

			function toggleSearchButtons(anchor: HTMLAnchorElement, isTurningOn: boolean, isUnique: boolean) {
				var $button = $(anchor).parent('li');
				var $container = $button.parent('ul');

				if(isUnique)
					$container.find('li').removeClass('selected');
				$button.toggleClass('selected', isTurningOn);
			}

			function filterButtons(showIds: string[]) {
				var $allVisibleButtons = $('#badge-selector-list li:visible');
				var $allHiddenButtons = $('#badge-selector-list li:hidden');

				$allVisibleButtons.filter(function() {
						var badgeId = getBadgeId(this);
						return showIds.indexOf(badgeId) == -1;
					}).hide();
				$allHiddenButtons.filter(function() {
						var badgeId = getBadgeId(this);
						return showIds.indexOf(badgeId) != -1;
					}).show();
			}

			function sortBadgeBy(func: (li: HTMLLIElement) => any, desc: boolean) {
				if(desc === undefined) desc = false;

				$('#badge-selector-list').append(
					$('#badge-selector-list li').toArray().sort((a, b) => {
						var key_a = func(a);
						var key_b = func(b);
						
						var ascend = key_a < key_b;
						if(desc) ascend = !ascend;
						
						if(key_a == key_b) {
							key_a = getBadgeId(a);
							key_b = getBadgeId(b);
							ascend = key_a < key_b;
						}

						return ascend ? -1 : 1;
					})
				);
			}
			function sortBadgeById(desc: boolean) {
				sortBadgeBy((li) => getBadgeId(li), desc);
			}
			function sortBadgeByKana(desc: boolean) {
				sortBadgeBy((li) => $(li).attr('data-kana-sort-key'), desc);
			}
			function sortBadgeByFeatureValue(feature: string, desc: boolean) {
				sortBadgeBy((li) => {
					var badgeId = getBadgeId(li);
					var ret: any = DB.badges[badgeId][feature];

					return ret !== undefined ? ret : 0;
				}, desc);
			}

			function clearFilter() {
				$('#badge-selector-list li').show();
				BadgeSearch.clear();
				$('#badge-search-buttons-race li,' +
					'#badge-search-buttons-rarity li,' +
					'#badge-search-buttons-feature li').removeClass('selected');

				sortByIdDesc = false;
				$('#badge-sort-badgeid').click();
			}

			function apply(badgeId: string) {
				closingCallback(badgeId);
				hide();
			}
			function cancel() {
				hide();
			}
			function show(callback: (badgeId: string) => void) {
				clearBadgeInfo();
				$maskScreen.show();
				$dialog.show();
				selectedBadgeId = null;
				closingCallback = callback;
			}
			function hide() {
				$dialog.hide();
				$maskScreen.hide();
			}

			//API
			return {
				//メソッド
				setup: setup,
				setCurrentMonster: setCurrentMonster,
				show: show,
				getFeatureCache: getFeatureCache
			};
		})();

		//API
		return {
			setupAll: setupAll
		};
	})();

	//ロード時
	$(function() {
		$dbLoad.done((data) => {
			var query = window.location.search.substring(1);
			if(Simulator.validateQueryString(query)) {
				Simulator.applyQueryString(query);
			}

			SimulatorUI.setupAll();
		});
	});
})(jQuery);
}
