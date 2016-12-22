/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />
/// <reference path="typings/rawdeflate.d.ts" />

/// <reference path="typings/dq10skill.d.ts" />

/// <reference path="dq10skill-monster-monster.ts" />
/// <reference path="dq10skill-monster-command.ts" />
/// <reference path="base64.ts" />

namespace Dq10.SkillSimulator {
	export var Simulator: SimulatorModel;
	export var MonsterDB: MonsterSimulatorDB;

	export const MONSTER_MAX = 8;

	export const BASIC_SKILL_COUNT = 3;
	export const ADDITIONAL_SKILL_MAX = 2;
	export const BADGE_COUNT = 4;

	export class SimulatorModel {
		//パラメータ格納用
		monsters: MonsterUnit[] = [];

		//モンスターID管理
		private lastId = 0;

		/* メソッド */

		//モンスター追加
		addMonster(monsterType: string, index?: number) {
			if(this.monsters.length >= MONSTER_MAX)
				return null;

			var newMonster = new MonsterUnit(monsterType, this.lastId++);
			if(index === undefined)
				this.monsters.push(newMonster);
			else
				this.monsters.splice(index, 0, newMonster);
			return newMonster;
		}

		//IDからモンスター取得
		getMonster(monsterId: string) {
			return this.monsters[this.indexOf(monsterId)];
		}

		//指定IDのモンスター削除
		deleteMonster(monsterId: string): any {
			var i = this.indexOf(monsterId);
			if(i !== null)
				return this.monsters.splice(i, 1)[0];
			else
				return false;
		}

		//指定IDのモンスターをひとつ下に並び替える
		movedownMonster(monsterId: string) {
			var i = this.indexOf(monsterId);
			if(i > this.monsters.length) return;

			this.monsters.splice(i, 2, this.monsters[i + 1], this.monsters[i]);
		}

		//指定IDのモンスターをひとつ上に並び替える
		moveupMonster(monsterId: string) {
			var i = this.indexOf(monsterId);
			if(i < 0) return;

			this.monsters.splice(i - 1, 2, this.monsters[i], this.monsters[i - 1]);
		}

		indexOf(monsterId: string) {
			for(var i = 0; i < this.monsters.length; i++) {
				if(this.monsters[i].id == monsterId) return i;
			}
			return null;
		}

		generateQueryString() {
			var serial = new MonsterSaveData.Serializer().exec(this.monsters);
			var utf8encoded = UTF8.toUTF8(serial);
			var zipped = RawDeflate.deflate(utf8encoded);
			return Base64.btoa(zipped);
		}

		applyQueryString(queryString: string) {
			var serial = '';
			if(queryString.indexOf(';') >= 0) {
				serial = queryString;
			} else {
				try {
					var zipped = Base64.atob(queryString);
					var utf8encoded = RawDeflate.inflate(zipped);
					serial = UTF8.fromUTF8(utf8encoded);
				} catch (e) {
				}
			}
			if(serial == '') return;

			new MonsterSaveData.Deserializer(serial).exec((monster, idnum) => {
				this.lastId = idnum;
				this.monsters.push(monster);
			});
		}

		validateQueryString(queryString: string) {
			if(!queryString.match(/^[A-Za-z0-9-_;]+$/))
				return false;

			//Base64文字列をセミコロンで繋げていた旧形式の場合
			if(queryString.indexOf(';') >= 0) {
				var query = queryString.split(';');
				// データと個体名がペアで連続するので2の倍数である
				if(query.length % 2 == 1)
					return false;

				return query.filter((q, i) => (i % 2) === 0).every((q) => {
					return (q.length * MonsterSaveData.BITS_ENCODE >= MonsterSaveData.bitDataLength());
				});
			}
			return true;
		}
	}

	/* UI */
	class SimulatorUI {
		private CLASSNAME_SKILL_ENABLED = 'enabled';
		private CLASSNAME_ERROR = 'error';

		private sim = Simulator;
		private com = new SimulatorCommandManager();
		private DB: MonsterSimulatorDB;

		private badgeSelector: BadgeSelector;

		constructor(sim: SimulatorModel) {
			this.sim = sim;
			this.DB = MonsterDB;
		}

		//モンスターのエントリ追加
		private drawMonsterEntry (monster: MonsterUnit) {
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
				$table = this.drawSkillTable(skillLine);
				$skillContainer.append($table);
			});
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				skillLine = 'additional' + s.toString();
				$table = this.drawSkillTable(skillLine);

				if(monster.restartCount < s + 1 || monster.getAdditionalSkill(s) === null)
					$table.hide();

				$skillContainer.append($table);
			}

			return $ent;
		}
		private drawSkillTable(skillLineId: string) {
			var $table = $('<table />').addClass(skillLineId).addClass('skill_table');
			$table.append('<caption><span class="skill_line_name">' +
				this.DB.skillLines[skillLineId].name +
				'</span>: <span class="skill_total">0</span></caption>')
				.append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');

			this.DB.skillLines[skillLineId].skills.forEach((skill, s) => {
				$('<tr />').addClass([skillLineId, s].join('_'))
					.append('<td class="skill_pt">' + skill.pt + '</td>')
					.append('<td class="skill_name">' + skill.name + '</td>')
					.appendTo($table);
			});

			return $table;
		}

		private refreshEntry(monsterId: string) {
			this.refreshAdditionalSkillSelector(monsterId);
			this.refreshAdditionalSkill(monsterId);
			this.refreshMonsterInfo(monsterId);
			Object.keys(this.DB.skillLines).forEach((skillLineId) =>
				this.refreshSkillList(monsterId, skillLineId)
			);
			this.refreshTotalStatus(monsterId);
			this.refreshControls(monsterId);
			this.refreshBadgeButtons(monsterId);
			this.refreshSaveUrl();
		}

		private refreshAll() {
			this.sim.monsters.forEach((monster) => this.refreshEntry(monster.id));
		}

		private refreshMonsterInfo(monsterId: string) {
			var monster = this.sim.getMonster(monsterId);
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

			$levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$(`#${monsterId} .error`).toggle(isLevelError);
			if(isLevelError) {
				$(`#${monsterId} .req_lv`).text(numToFormedStr(requiredLevel));
				$(`#${monsterId} .exp_remain`).text(numToFormedStr(monster.requiredExpRemain()));
			}
		}

		private refreshSkillList(monsterId: string, skillLineId: string) {
			$(`#${monsterId} tr[class^=${skillLineId}_]`).removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
			var monster = this.sim.getMonster(monsterId);

			var skillPt = monster.getSkillPt(skillLineId);
			var skills = this.DB.skillLines[skillLineId].skills;
			this.DB.skillLines[skillLineId].skills.some((skill, s) => {
				if(skillPt < skill.pt)
					return true;

				$(`#${monsterId} .${skillLineId}_${s}`).addClass(this.CLASSNAME_SKILL_ENABLED);
				return false;
			});
			$(`#${monsterId} .${skillLineId} .skill_total`).text(skillPt);
		}

		private refreshControls(monsterId: string) {
			var monster = this.sim.getMonster(monsterId);

			$(`#${monsterId} .lv_select>select`).val(monster.getLevel());
			$(`#${monsterId} .restart_count`).val(monster.getRestartCount());

			Object.keys(monster.skillPts).forEach((skillLineId) => {
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));
			});

			$(`#${monsterId} .natsuki-selector>select`).val(monster.getNatsuki());
		}

		private refreshSaveUrl() {
			var queryString = this.sim.generateQueryString();
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

		private refreshAdditionalSkillSelector(monsterId: string) {
			var monster = this.sim.getMonster(monsterId);
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				$(`#${monsterId} .additional_skill_selector-${s}`).toggle(monster.restartCount > s);
			}

			$(`#${monsterId} .additional_skill_selector select`).empty();

			if(monster.restartCount >= 1) {
				this.DB.additionalSkillLines.forEach((additionalSkillData) => {
					var skillData = this.DB.skillLines[additionalSkillData.name];
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

		private refreshAdditionalSkill(monsterId: string) {
			var monster = this.sim.getMonster(monsterId);
			var $table;

			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				$table = $(`#${monsterId} .additional${s}`);
				if(monster.restartCount >= s + 1 && monster.getAdditionalSkill(s) !== null) {
					this.refreshAdditionalSkillTable($table, monster.getAdditionalSkill(s));
					$table.show();
				} else {
					$table.hide();
				}
			}
		}

		private refreshAdditionalSkillTable($table: JQuery, newSkillLine: string) {
			var data = this.DB.skillLines[newSkillLine];
			var tableClass = $table.attr('class').split(' ')[0];

			$table.find('caption .skill_line_name').text(data.name);

			data.skills.forEach((skill, i) =>  {
				var $tr = $table.find(`tr.${tableClass}_${i}`);

				var hintText = this.getHintText(skill);
				$tr.attr('title', hintText);

				$tr.children('.skill_pt').text(skill.pt);
				$tr.children('.skill_name').text(skill.name);
			});
		}

		private refreshTotalStatus(monsterId: string) {
			var monster = this.sim.getMonster(monsterId);
			var statusArray = 'maxhp,maxmp,atk,pow,def,magic,heal,spd,dex,charm,weight'.split(',');

			var $cont = $(`#${monsterId} .status_info dl`);
			statusArray.forEach((status) => {
				$cont.find('.' + status).text(monster.getTotalStatus(status));
			});
		}

		private drawBadgeButton(monsterId: string, badgeIndex: number) {
			var monster = this.sim.getMonster(monsterId);

			var $badgeButton = $(`#append-badge${badgeIndex}-${monsterId}`);
			var $badgeButtonCont = $badgeButton.closest('li');

			var badgeId = monster.badgeEquip[badgeIndex];
			var badge = badgeId ? this.DB.badges[badgeId] : null;

			var buttonText = '';
			var buttonHintText = '';

			if(badge) {
				buttonText = badgeId + ' ' + badge.name + '・' + this.DB.badgerarity[badge.rarity];
				buttonHintText = this.badgeSelector.getFeatureCache(badgeId).join("\n");
			} else {
				if(badgeIndex == monster.badgeEquip.length - 1)
					buttonText = 'スペシャルバッジ';
				else
					buttonText = 'バッジ' + (badgeIndex + 1).toString();
			}
			$badgeButton.text(buttonText).attr('title', buttonHintText);

			var rarityClass = badge === null ? 'blank' : badge.rarity;

			$badgeButtonCont.toggleClass('blank', rarityClass == 'blank');
			Object.keys(this.DB.badgerarity).forEach((rarity) => {
				$badgeButtonCont.toggleClass(rarity, rarityClass == rarity);
			});
		}

		private refreshBadgeButtons(monsterId: string) {
			for(var i = 0; i < BADGE_COUNT; i++)
				this.drawBadgeButton(monsterId, i);
		}

		private getCurrentMonsterId(currentNode: Element | EventTarget) {
			return $(currentNode).parents('.monster_ent').attr('id');
		}

		private getCurrentSkillLine(currentNode: Element | EventTarget) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		private getHintText(skill: Skill) {
			var hintText = skill.desc || '';
			if((skill.mp !== null) && (skill.mp !== undefined))
				hintText += `\n（消費MP: ${skill.mp}）`;
			if((skill.charge !== null) && (skill.charge !== undefined))
				hintText += `\n（チャージ: ${skill.charge}秒）`;
			if(skill.gold)
				hintText += `\n（${skill.gold}G）`;

			return hintText;
		}

		private setupEntry(monsterId: string) {
			var $ent = $('#' + monsterId);

			//レベル選択セレクトボックス項目設定
			var $select = $ent.find('.lv_select>select');
			for(var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
				$select.append($("<option />").val(i).text(`${i} (${this.DB.skillPtsGiven[i]})`));
			}
			//レベル選択セレクトボックス変更時
			$select.change((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				this.sim.getMonster(monsterId).updateLevel($(e.currentTarget).val());
				this.refreshMonsterInfo(monsterId);
				//refreshSaveUrl();
			});

			//レベル転生回数スピンボタン設定
			var $spinner = $ent.find('.restart_count');
			$spinner.spinner({
				min: this.DB.consts.restart.min,
				max: this.DB.consts.restart.max,
				spin: (e, ui) => {
					var monsterId = this.getCurrentMonsterId(e.currentTarget);
					var monster = this.sim.getMonster(monsterId);

					if(monster.updateRestartCount(ui.value)) {
						this.refreshAdditionalSkillSelector(monsterId);
						this.refreshAdditionalSkill(monsterId);
						this.refreshMonsterInfo(monsterId);
						this.refreshTotalStatus(monsterId);
					} else {
						return false;
					}
				},
				change: (e, ui) => {
					var monsterId = this.getCurrentMonsterId(e.currentTarget);
					var monster = this.sim.getMonster(monsterId);

					if(isNaN($(e.currentTarget).val())) {
						$(e.currentTarget).val(monster.getRestartCount());
						return false;
					}
					if(monster.updateRestartCount(parseInt($(e.currentTarget).val(), 10))) {
						this.refreshAdditionalSkillSelector(monsterId);
						this.refreshAdditionalSkill(monsterId);
						this.refreshMonsterInfo(monsterId);
						this.refreshTotalStatus(monsterId);
						this.refreshSaveUrl();
					} else {
						$(e.currentTarget).val(monster.getRestartCount());
						return false;
					}
				},
				stop: (e, ui) => {
					this.refreshSaveUrl();
				}
			});

			//スピンボタン設定
			$spinner = $ent.find('.ptspinner');
			$spinner.spinner({
				min: this.DB.consts.skillPts.min,
				max: this.DB.consts.skillPts.max,
				spin: (e, ui) => {
					var monsterId = this.getCurrentMonsterId(e.currentTarget);
					var skillLineId = this.getCurrentSkillLine(e.currentTarget);

					if(this.sim.getMonster(monsterId).updateSkillPt(skillLineId, ui.value)) {
						this.refreshSkillList(monsterId, skillLineId);
						this.refreshMonsterInfo(monsterId);
						this.refreshTotalStatus(monsterId);
						e.stopPropagation();
					} else {
						return false;
					}
				},
				change: (e, ui) => {
					var target = e.currentTarget || e.target;
					var monsterId = this.getCurrentMonsterId(target);
					var skillLineId = this.getCurrentSkillLine(target);
					var monster = this.sim.getMonster(monsterId);

					if(isNaN($(target).val())) {
						$(target).val(monster.getSkillPt(skillLineId));
						return false;
					}
					if(monster.updateSkillPt(skillLineId, parseInt($(target).val(), 10))) {
						this.refreshSkillList(monsterId, skillLineId);
						this.refreshMonsterInfo(monsterId);
						this.refreshTotalStatus(monsterId);
						this.refreshSaveUrl();
					} else {
						$(target).val(monster.getSkillPt(skillLineId));
						return false;
					}
				},
				stop: (e, ui) => {
					this.refreshSaveUrl();
				}
			});
			//テキストボックスクリック時数値を選択状態に
			$spinner.click((e) => {
				$(e.currentTarget).select();
			});
			//テキストボックスでEnter押下時更新して選択状態に
			$spinner.keypress((e) => {
				if(e.which == 13) {
					$('#url_text').focus();
					$(e.currentTarget).focus().select();
				}
			});

			//リセットボタン設定
			$ent.find('.reset').button({
				icons: { primary: 'ui-icon-refresh' },
				text: false
			}).click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var skillLineId = this.getCurrentSkillLine(e.currentTarget);
				var monster = this.sim.getMonster(monsterId);

				monster.updateSkillPt(skillLineId, 0);
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));
				this.refreshSkillList(monsterId, skillLineId);
				this.refreshMonsterInfo(monsterId);
				this.refreshTotalStatus(monsterId);
				this.refreshSaveUrl();
			});

			//スキルテーブル項目クリック時
			$ent.find('.skill_table tr[class]').click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var skillLineId = this.getCurrentSkillLine(e.currentTarget);
				var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);
				var monster = this.sim.getMonster(monsterId);

				var requiredPt = this.DB.skillLines[skillLineId].skills[skillIndex].pt;

				monster.updateSkillPt(skillLineId, requiredPt);
				$(`#${monsterId} .${skillLineId} .ptspinner`).spinner('value', monster.getSkillPt(skillLineId));

				this.refreshSkillList(monsterId, skillLineId);
				this.refreshMonsterInfo(monsterId);
				this.refreshTotalStatus(monsterId);
				this.refreshSaveUrl();
			});

			//おりたたむ・ひろげるボタン設定
			var HEIGHT_FOLDED = '4.8em';
			var HEIGHT_UNFOLDED = $ent.height() + 'px';
			var CLASSNAME_FOLDED = 'folded';

			$ent.find('.toggle_ent').button({
				icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				text: false,
				label: 'おりたたむ'
			}).click((e) => {
				var $entry = $(e.currentTarget).parents('.monster_ent');
				$entry.toggleClass(CLASSNAME_FOLDED);

				if($entry.hasClass(CLASSNAME_FOLDED)) {
					$entry.animate({height: HEIGHT_FOLDED});
					$(e.currentTarget).button('option', {
						icons: {primary: 'ui-icon-arrowthickstop-1-s'},
						label: 'ひろげる'
					});
				} else {
					$entry.animate({height: HEIGHT_UNFOLDED});
					$(e.currentTarget).button('option', {
						icons: {primary: 'ui-icon-arrowthickstop-1-n'},
						label: 'おりたたむ'
					});
				}
			});

			//ヒントテキスト設定
			Object.keys(this.DB.skillLines).forEach((skillLineId) => {
				this.DB.skillLines[skillLineId].skills.forEach((skill, i) => {
					var hintText = this.getHintText(skill);
					$(`.${skillLineId}_${i}`).attr('title', hintText);
				})
			})

			//削除ボタン
			$ent.find('.delete_entry').button({
				icons: { primary: 'ui-icon-close' },
				text: false
			}).click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var monster = this.sim.getMonster(monsterId);

				var additionalLevel = '';
				if(monster.getRestartCount() > 0)
					additionalLevel = `(+${monster.getRestartCount()})`;

				var message = monster.data.name +
					' Lv' + monster.getLevel().toString() + additionalLevel +
					`「${monster.getIndividualName()}」を削除します。` +
					'\nよろしいですか？';
				if(!window.confirm(message)) return;

				this.com.deleteMonster(monsterId);
			});

			//下へボタン
			$ent.find('.movedown').button({
				icons: { primary: 'ui-icon-triangle-1-s' },
				text: false
			}).click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var $ent = $('#' + monsterId);

				if($ent.next().length === 0) return;

				var zIndex = $ent.css('z-index');
				var pos = $ent.position();

				$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
				$ent.animate({top: $ent.next().position().top + $ent.next().height()}, () => {
					$ent.insertAfter($ent.next());
					$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
					this.sim.movedownMonster(monsterId);
					this.refreshSaveUrl();
				});
			});
			//上へボタン
			$ent.find('.moveup').button({
				icons: { primary: 'ui-icon-triangle-1-n' },
				text: false
			}).click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var $ent = $('#' + monsterId);

				if($ent.prev().length === 0) return;

				var zIndex = $ent.css('z-index');
				var pos = $ent.position();

				$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
				$ent.animate({top: $ent.prev().position().top}, () => {
					$ent.insertBefore($ent.prev());
					$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
					this.sim.moveupMonster(monsterId);
					this.refreshSaveUrl();
				});
			});

			//個体名テキストボックス
			$ent.find('.indiv_name input').change((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var monster = this.sim.getMonster(monsterId);

				monster.updateIndividualName($(e.currentTarget).val());
				this.refreshSaveUrl();
			});

			//転生追加スキルセレクトボックス
			$ent.find('.additional_skill_selector select').change((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var monster = this.sim.getMonster(monsterId);

				var selectorId = parseInt($(e.currentTarget).attr('id').match(/^select-additional(\d+)-/)[1]);
				if(monster.updateAdditionalSkill(selectorId, $(e.currentTarget).val())) {
					this.refreshAdditionalSkill(monsterId);
					this.refreshMonsterInfo(monsterId);
					this.refreshTotalStatus(monsterId);
					this.refreshSaveUrl();
				} else {
					$(e.currentTarget).val(monster.getAdditionalSkill(selectorId));
					return false;
				}
			});

			//バッジ選択ボタン
			$ent.find('.badge-button-container a').click((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var badgeIndex = parseInt($(e.currentTarget).attr('id').match(/^append-badge(\d+)-/)[1], 10);

				this.badgeSelector.setCurrentMonster(this.sim.getMonster(monsterId), badgeIndex);
				this.badgeSelector.show((badgeId) => {
					this.sim.getMonster(monsterId).badgeEquip[badgeIndex] = badgeId;
					this.drawBadgeButton(monsterId, badgeIndex);
					this.refreshTotalStatus(monsterId);
					this.refreshSaveUrl();
				});
			});

			//なつき度選択セレクトボックス
			var $natsukiSelect = $ent.find('.natsuki-selector>select');
			this.DB.natsukiPts.forEach((natukiData, i) => {
				$natsukiSelect.append($("<option />").val(i).text(natukiData.natsukido.toString() + '(' + natukiData.pt.toString() + ')'));
			});
			//なつき度選択セレクトボックス変更時
			$natsukiSelect.change((e) => {
				var monsterId = this.getCurrentMonsterId(e.currentTarget);
				var monster = this.sim.getMonster(monsterId);

				monster.updateNatsuki(parseInt($(e.currentTarget).val()));
				this.refreshMonsterInfo(monsterId);
				this.refreshSaveUrl();
			});
		}

		private setupConsole() {
			//URLテキストボックスクリック時
			$('#url_text').click((e) => {
				$(e.currentTarget).select();
			});

			//保存用URLツイートボタン設定
			$('#tw-saveurl').button().click((e) => {
				if($(e.currentTarget).attr('href') === '') return false;

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
				window.open((<HTMLAnchorElement>e.currentTarget).href, null, windowParam);

				return false;
			});

			//すべておりたたむ・すべてひろげるボタン
			var CLASSNAME_FOLDED = 'folded';
			$('#fold-all').click((e) => {
				$('.monster_ent:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});
			$('#unfold-all').click((e) => {
				$('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
				$('body, html').animate({scrollTop: 0});
			});

			//レベル一括設定
			//セレクトボックス初期化
			var $select = $('#setalllevel>select');
			for(var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
				$select.append($("<option />").val(i).text(i.toString()));
			}
			$select.val(this.DB.consts.level.max);

			$('#setalllevel>button').button().click((e) => {
				this.sim.monsters.forEach((monster) => monster.updateLevel($select.val()));
				this.refreshAll();
			});

			$('.appendbuttons a').click((e) => {
				var monsterType = $(e.currentTarget).attr('id').replace('append-', '');
				this.com.addMonster(monsterType);
			});
		}

		private setupEvents() {
			this.com.on('MonsterAppended', (monster, index) => {
				$('#initial-instruction').hide();

				$('#monsters').append(this.drawMonsterEntry(monster));
				this.setupEntry(monster.id);
				this.refreshEntry(monster.id);

				$('#' + monster.id + ' .indiv_name input').focus().select();
			});
			this.com.on('MonsterRemoved', (monster) => {
				$('#' + monster.id).remove();

				this.refreshSaveUrl();

				if(this.sim.monsters.length === 0)
					$('#initial-instruction').show();
			});
		}

		setupAll() {
			this.setupConsole();
			this.setupEvents();
			this.badgeSelector = new BadgeSelector();
			this.badgeSelector.setup();

			$('#monsters').empty();

			if(this.sim.monsters.length > 0)
				$('#initial-instruction').hide();

			this.sim.monsters.forEach((monster) => $('#monsters').append(this.drawMonsterEntry(monster)));
			this.setupEntry('monsters');

			this.refreshAll();
		}
	}

	//バッジ選択ダイアログ
	class BadgeSelector {
		private $dialog;
		private $maskScreen;

		private dialogResult = false;
		private selectedBadgeId: string = null;
		private closingCallback: (badgeId: string) => void;

		//バッジ効果リストのキャッシュ
		private featureCache: {[badgeId: string]: string[]} = {};

		//ソート順の昇降を保持
		private sortByIdDesc = false;
		private sortByKanaDesc = false;

		//モンスターデータを一部保持
		private status: {[statusType: string]: number} = {};
		private currentBadgeId: string = null;
		private badgeEquip: string[] = [];

		private DB: MonsterSimulatorDB;
		private badgeSearch: BadgeSearch;

		constructor() {
			this.DB = MonsterDB;
			this.badgeSearch = new BadgeSearch();
		}

		setup() {
			this.$dialog = $('#badge-selector');
			this.$maskScreen = $('#dark-screen');

			this.$maskScreen.click((e) => {
				this.cancel();
			});

			//ヘッダー部ドラッグで画面移動可能
			this.$dialog.draggable({
				handle: '#badge-selector-header',
				cursor: 'move'
			});

			//バッジをはずすボタン
			$('#badge-selector-remove').click((e) => {
				this.apply(null);
			}).hover((e) => {
				this.clearBadgeInfo();
				this.refreshStatusAfter(null);
			});

			//バッジ設定ボタン
			$('#badge-selector-list a').click((e) => {
				var badgeId = this.getBadgeId(<Element>e.currentTarget);
				this.apply(badgeId);
			}).hover((e) => {
				var badgeId = this.getBadgeId(<Element>e.currentTarget);
				this.refreshBadgeInfo(badgeId);
				this.refreshStatusAfter(badgeId);
			});

			//バッジ検索ボタン
			$('#badge-search-buttons-race,' +
				'#badge-search-buttons-rarity,' +
				'#badge-search-buttons-feature').find('a').click((e) => {
				var searchKey = $(e.currentTarget).attr('data-search-key');
				var filterType = $(e.currentTarget).attr('data-filter-type');

				var isTurningOn = this.badgeSearch.toggleSearch(filterType, searchKey);
				this.toggleSearchButtons(<HTMLAnchorElement>e.currentTarget, isTurningOn, (filterType == 'race' || filterType == 'rarity'));

				this.filterButtons(this.badgeSearch.getIds());

				if(isTurningOn && filterType == 'feature' && this.DB.badgefeature[searchKey]['type'] == 'int') {
					this.sortBadgeByFeatureValue(searchKey, true);
				}
			});

			//バッジソートボタン
			$('#badge-sort-badgeid').click((e) => {
				this.sortBadgeById(this.sortByIdDesc);
				this.sortByIdDesc = !this.sortByIdDesc;
				this.sortByKanaDesc = false;
			});
			$('#badge-sort-kana').click((e) => {
				this.sortBadgeByKana(this.sortByKanaDesc);
				this.sortByKanaDesc = !this.sortByKanaDesc;
				this.sortByIdDesc = false;
			});

			//検索クリアボタン
			$('#badge-search-clear').click((e) => {
				this.clearFilter();
			});
		}

		private getBadgeId(elem: Element): string {
			if(elem.tagName.toUpperCase() == 'LI')
				elem = $(elem).find('a').get(0);

			if($(elem).attr('id') == 'badge-selector-remove')
				return null;
			else
				return $(elem).attr('data-badge-id');
		}

		private clearBadgeInfo() {
			$('#badge-selector-badge-id').text('');
			$('#badge-selector-badge-name').text('');
			$('#badge-selector-race').text('');
			$('#badge-selector-feature-list').empty();
		}

		private refreshBadgeInfo(badgeId: string) {
			var badge = this.DB.badges[badgeId];
			if(!badge) return;

			$('#badge-selector-badge-id').text(badgeId);

			var badgeName = badge.name + '・' + this.DB.badgerarity[badge.rarity];
			$('#badge-selector-badge-name').text(badgeName);

			var raceName;
			if(badge.race == 'special')
				raceName = 'スペシャルバッジ';
			else
				raceName = this.DB.badgerace[badge.race].name + '系';
			$('#badge-selector-race').text(raceName);

			var features = this.getFeatureCache(badgeId);

			var $featureList = $('#badge-selector-feature-list');
			$featureList.empty();
			features.forEach((feature) => $('<li>').text(feature).appendTo($featureList));
		}
		getFeatureCache(badgeId: string) {
			if(this.featureCache[badgeId])
				return this.featureCache[badgeId];

			var badge = this.DB.badges[badgeId];
			this.featureCache[badgeId] = (new BadgeFeature(badge)).getFeatures();

			return this.featureCache[badgeId];
		}

		private STATUS_ARRAY = 'atk,def,maxhp,maxmp,magic,heal,spd,dex,stylish,weight'.split(',');

		setCurrentMonster(monster: MonsterUnit, badgeIndex: number) {
			this.STATUS_ARRAY.forEach((s) => {
				this.status[s] = monster.getTotalStatus(s);

				$('#badge-status-current-' + s).text(this.status[s]);
			});
			this.currentBadgeId = monster.badgeEquip[badgeIndex];

			this.refreshStatusAfter(null);
		}

		private refreshStatusAfter(badgeId: string) {
			var currentBadge: Badge = null;
			if(this.currentBadgeId !== null)
				currentBadge = this.DB.badges[this.currentBadgeId];
			var newBadge: Badge = null;
			if(badgeId !== null)
				newBadge = this.DB.badges[badgeId];

			this.STATUS_ARRAY.forEach((s) => {
				var before = this.status[s];

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

		private toggleSearchButtons(anchor: HTMLAnchorElement, isTurningOn: boolean, isUnique: boolean) {
			var $button = $(anchor).parent('li');
			var $container = $button.parent('ul');

			if(isUnique)
				$container.find('li').removeClass('selected');
			$button.toggleClass('selected', isTurningOn);
		}

		private filterButtons(showIds: string[]) {
			var $allVisibleButtons = $('#badge-selector-list li:visible');
			var $allHiddenButtons = $('#badge-selector-list li:hidden');

			$allVisibleButtons.filter((i, elem) => {
				var badgeId = this.getBadgeId(elem);
				return showIds.indexOf(badgeId) == -1;
			}).hide();
			$allHiddenButtons.filter((i, elem) => {
				var badgeId = this.getBadgeId(elem);
				return showIds.indexOf(badgeId) != -1;
			}).show();
		}

		private sortBadgeBy(func: (li: HTMLLIElement) => any, desc: boolean) {
			if(desc === undefined) desc = false;

			$('#badge-selector-list').append(
				$('#badge-selector-list li').toArray().sort((a, b) => {
					var key_a = func(a);
					var key_b = func(b);

					var ascend = key_a < key_b;
					if(desc) ascend = !ascend;

					if(key_a == key_b) {
						key_a = this.getBadgeId(a);
						key_b = this.getBadgeId(b);
						ascend = key_a < key_b;
					}

					return ascend ? -1 : 1;
				})
			);
		}
		private sortBadgeById(desc: boolean) {
			this.sortBadgeBy((li) => this.getBadgeId(li), desc);
		}
		private sortBadgeByKana(desc: boolean) {
			this.sortBadgeBy((li) => $(li).attr('data-kana-sort-key'), desc);
		}
		private sortBadgeByFeatureValue(feature: string, desc: boolean) {
			this.sortBadgeBy((li) => {
				var badgeId = this.getBadgeId(li);
				var ret: any = this.DB.badges[badgeId][feature];

				return ret !== undefined ? ret : 0;
			}, desc);
		}

		private clearFilter() {
			$('#badge-selector-list li').show();
			this.badgeSearch.clear();
			$('#badge-search-buttons-race li,' +
				'#badge-search-buttons-rarity li,' +
				'#badge-search-buttons-feature li').removeClass('selected');

			this.sortByIdDesc = false;
			$('#badge-sort-badgeid').click();
		}

		private apply(badgeId: string) {
			this.closingCallback(badgeId);
			this.hide();
		}
		private cancel() {
			this.hide();
		}
		show(callback: (badgeId: string) => void) {
			this.clearBadgeInfo();
			this.$maskScreen.show();
			this.$dialog.show();
			this.selectedBadgeId = null;
			this.closingCallback = callback;
		}
		private hide() {
			this.$dialog.hide();
			this.$maskScreen.hide();
		}
	}

	class BadgeFeature {
		private badge: Badge;
		private DB: MonsterSimulatorDB;

		constructor(badge: Badge) {
			this.badge = badge;
			this.DB = MonsterDB;
		}

		getFeatures(): string[] {
			var features: string[] = [];

			Object.keys(this.DB.badgefeature).forEach((f) => {
				var feature = this.DB.badgefeature[f];
				var val = this.badge[f];
				if(!val) return;

				switch (feature.type) {
					case 'int':
					case 'string':
						if(feature.format)
							features.push(feature.format.replace('@v', val));
						else
							features.push(feature.name + ' +' + val.toString());
						break;
					case 'array':
						features = features.concat(this.getFeatureArrayFromArray(feature.format, val));
						break;
					case 'hash':
						features = features.concat(this.getFeatureArrayFromHash(feature.format, val));
						break;
				}
			});

			return features;
		}

		private getFeatureArrayFromArray(format: string, fromArray: string[]) {
			return fromArray.map((ent) => format.replace('@v', ent));
		}
		private getFeatureArrayFromHash(format: string, fromHash: {[key: string]: any}) {
			return Object.keys(fromHash).map((key) => {
				var value = fromHash[key];
				return format.replace('@k', key).replace('@v', value);
			});
		}
	}

	//検索フィルター状態保持変数
	interface SearchFilter {
		filterType: string;
		searchKey: string;
	};

	//検索機能
	class BadgeSearch {
		private univIds: string[] = []; //全集合
		private search: SearchFilter[] = [];

		//検索キャッシュ
		private searchCache = {};

		private DB: MonsterSimulatorDB;

		constructor() {
			this.DB = MonsterDB;
		}

		toggleSearch(filterType: string, searchKey: string) {
			var isTurningOn = true;

			this.search.some((filter, i) => {
				if(filter.filterType == filterType && filter.searchKey == searchKey) {
					isTurningOn = false;
					this.search.splice(i, 1);
					return true;
				}
				if((filterType == 'race' || filterType == 'rarity') && filter.filterType == filterType) {
					this.search.splice(i, 1);
					return true;
				}
			});

			if(isTurningOn)
				this.search.push({
					filterType: filterType,
					searchKey: searchKey
				});

			return isTurningOn;
		}

		getIds() {
			return this.search.reduce((ids, filter) => {
				var cacheKey = filter.filterType + '_' + filter.searchKey;
				return this.arrayIntersect(ids, this.getSearchCache(cacheKey));
			}, this.getUnivIds());
		}

		private arrayIntersect(array1: string[], array2: string[]) {
			return array1.filter((val) => array2.indexOf(val) >= 0);
		}

		private getSearchCache(key: string) {
			if(this.searchCache[key])
				return this.searchCache[key];

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
				case 'word':
					filterFunc = (badge) => {
						var features = (new BadgeFeature(badge)).getFeatures();
						return features.some((f) => f.indexOf(searchKey) >= 0);
					}
					break;
				default:
					throw 'UnknownFilterType';
			}

			return this.getUnivIds().filter((id) => filterFunc(this.DB.badges[id]));
		}

		private getUnivIds() {
			if(this.univIds.length > 0)
				return this.univIds;

			this.univIds = Object.keys(this.DB.badges);
			return this.univIds;
		}

		clear() {
			this.search = [];
		}
	}
	//数値を3桁区切りに整形
	function numToFormedStr(num: number) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}

(function($: JQueryStatic) {
	Simulator = new SimulatorModel();

	//データJSONを格納する変数
	var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-monster-data.json');
	var $dbLoad = $.getJSON(DATA_JSON_URI, (data) => {
		MonsterDB = data;
	});

	//ロード時
	$(() => {
		$dbLoad.done((data) => {
			var query = window.location.search.substring(1);
			if(Simulator.validateQueryString(query)) {
				Simulator.applyQueryString(query);
			}

			var ui = new SimulatorUI(Simulator);
			ui.setupAll();
		});
	});
})(jQuery);
}
