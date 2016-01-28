/// <reference path="dq10skill-monster-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var MonsterUnit = (function () {
            function MonsterUnit(monsterType, idnum) {
                var _this = this;
                this.skillPts = {};
                this.data = SkillSimulator.MonsterDB.monsters[monsterType];
                this.monsterType = monsterType;
                this.level = SkillSimulator.MonsterDB.consts.level.max;
                this.indivName = this.data.defaultName;
                this.restartCount = SkillSimulator.MonsterDB.consts.restart.max;
                this.id = monsterType + '_' + idnum.toString();
                this.data.skillLines.forEach(function (skillLineId) {
                    _this.skillPts[skillLineId] = 0;
                });
                //転生追加スキル
                this.additionalSkills = [];
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    this.additionalSkills[s] = null;
                    this.skillPts['additional' + s.toString()] = 0;
                }
                //バッジ
                this.badgeEquip = [null, null, null, null];
                //なつき度
                this.natsuki = SkillSimulator.MonsterDB.natsukiPts.length - 1;
            }
            //スキルポイント取得
            MonsterUnit.prototype.getSkillPt = function (skillLineId) {
                return this.skillPts[skillLineId];
            };
            //スキルポイント更新：不正値の場合falseを返す
            MonsterUnit.prototype.updateSkillPt = function (skillLineId, newValue) {
                if (newValue < SkillSimulator.MonsterDB.consts.skillPts.min ||
                    newValue > SkillSimulator.MonsterDB.consts.skillPts.max) {
                    return false;
                }
                this.skillPts[skillLineId] = newValue;
                return true;
            };
            ;
            //レベル値取得
            MonsterUnit.prototype.getLevel = function () {
                return this.level;
            };
            ;
            //レベル値更新
            MonsterUnit.prototype.updateLevel = function (newValue) {
                var oldValue = this.level;
                if (newValue < SkillSimulator.MonsterDB.consts.level.min ||
                    newValue > SkillSimulator.MonsterDB.consts.level.max) {
                    return oldValue;
                }
                this.level = newValue;
                return newValue;
            };
            ;
            //スキルポイント合計
            MonsterUnit.prototype.totalSkillPts = function () {
                var _this = this;
                return Object.keys(this.skillPts).reduce(function (prev, skillLineId) {
                    var m = skillLineId.match(/^additional(\d+)/);
                    if (m && (_this.restartCount < parseInt(m[1], 10) + 1 ||
                        _this.getAdditionalSkill(parseInt(m[1], 10)) === null))
                        return prev;
                    return prev + _this.skillPts[skillLineId];
                }, 0);
            };
            ;
            //現在のレベルに対するスキルポイント最大値
            MonsterUnit.prototype.maxSkillPts = function () {
                return SkillSimulator.MonsterDB.skillPtsGiven[this.level];
            };
            ;
            //スキルポイント合計に対する必要レベル取得
            MonsterUnit.prototype.requiredLevel = function () {
                var restartSkillPt = this.getRestartSkillPt();
                var natsukiSkillPts = this.getNatsukiSkillPts();
                var total = this.totalSkillPts() - restartSkillPt - natsukiSkillPts;
                for (var l = SkillSimulator.MonsterDB.consts.level.min; l <= SkillSimulator.MonsterDB.consts.level.max; l++) {
                    if (SkillSimulator.MonsterDB.skillPtsGiven[l] >= total)
                        return l;
                }
                return NaN;
            };
            ;
            //モンスター・レベルによる必要経験値
            MonsterUnit.prototype.requiredExp = function (level) {
                return Math.floor(SkillSimulator.MonsterDB.expRequired[this.data.expTable][level] *
                    (1 + this.restartCount * SkillSimulator.MonsterDB.consts.restart.expRatio));
            };
            ;
            //転生時の必要経験値 Lv50経験値×転生補正値の累計
            MonsterUnit.prototype.additionalExp = function () {
                var expMax = SkillSimulator.MonsterDB.expRequired[this.data.expTable][SkillSimulator.MonsterDB.consts.level.max];
                if (isNaN(expMax))
                    return 0;
                var additionalExp = 0;
                for (var r = 0; r < this.restartCount; r++) {
                    additionalExp += Math.floor(expMax * (1 + r * SkillSimulator.MonsterDB.consts.restart.expRatio));
                }
                return additionalExp;
            };
            ;
            //不足経験値
            MonsterUnit.prototype.requiredExpRemain = function () {
                var required = this.requiredLevel();
                if (required <= this.level)
                    return 0;
                var remain = this.requiredExp(required) - this.requiredExp(this.level);
                return remain;
            };
            ;
            //個体名の取得
            MonsterUnit.prototype.getIndividualName = function () {
                return this.indivName;
            };
            ;
            //個体名の更新
            MonsterUnit.prototype.updateIndividualName = function (newName) {
                this.indivName = newName;
            };
            ;
            //転生回数の取得
            MonsterUnit.prototype.getRestartCount = function () {
                return this.restartCount;
            };
            ;
            //転生回数の更新
            MonsterUnit.prototype.updateRestartCount = function (newValue) {
                if (newValue < SkillSimulator.MonsterDB.consts.restart.min || newValue > SkillSimulator.MonsterDB.consts.restart.max) {
                    return false;
                }
                this.restartCount = newValue;
                return true;
            };
            ;
            //転生による追加スキルポイントの取得
            MonsterUnit.prototype.getRestartSkillPt = function () {
                return SkillSimulator.MonsterDB.consts.restart.skillPts[this.restartCount];
            };
            ;
            //転生追加スキルの取得
            MonsterUnit.prototype.getAdditionalSkill = function (skillIndex) {
                return this.additionalSkills[skillIndex];
            };
            ;
            //転生追加スキルの更新
            MonsterUnit.prototype.updateAdditionalSkill = function (skillIndex, newValue) {
                if (skillIndex < 0 || skillIndex > SkillSimulator.ADDITIONAL_SKILL_MAX)
                    return false;
                if (newValue !== null) {
                    for (var i = 0; i < this.additionalSkills.length; i++) {
                        if (i == skillIndex)
                            continue;
                        if (newValue == this.additionalSkills[i])
                            return false;
                    }
                }
                this.additionalSkills[skillIndex] = newValue;
                return true;
            };
            ;
            //なつき度達成状態の取得
            MonsterUnit.prototype.getNatsuki = function () {
                return this.natsuki;
            };
            ;
            //なつき度達成状態の更新
            MonsterUnit.prototype.updateNatsuki = function (natsuki) {
                this.natsuki = natsuki;
                return true;
            };
            ;
            //なつき度に対するSP取得
            MonsterUnit.prototype.getNatsukiSkillPts = function () {
                return SkillSimulator.MonsterDB.natsukiPts[this.getNatsuki()].pt;
            };
            ;
            //Lv50時の各種ステータス合計値取得
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
            //こうげき力  : atk
            //しゅび力    : def
            MonsterUnit.prototype.getTotalStatus = function (status) {
                var total = this.getTotalPassive(status);
                //Lv50時ステータス
                if (status == 'atk') {
                    total += this.getTotalStatus('pow');
                }
                else if (status == 'stylish') {
                    total += this.getTotalStatus('charm');
                }
                else {
                    total += this.data.status[status];
                    //転生時のステータス増分
                    total += this.data.increment[status] * this.restartCount;
                }
                //バッジ
                for (var i = 0; i < this.badgeEquip.length; i++) {
                    if (this.badgeEquip[i] === null)
                        continue;
                    var badge = SkillSimulator.MonsterDB.badges[this.badgeEquip[i]];
                    if (badge[status])
                        total += badge[status];
                }
                return total;
            };
            ;
            //パッシブスキルのステータス加算合計値取得
            MonsterUnit.prototype.getTotalPassive = function (status) {
                var _this = this;
                return Object.keys(this.skillPts).reduce(function (wholeTotal, skillLineId) {
                    var m = skillLineId.match(/^additional(\d+)/);
                    var skills;
                    if (m) {
                        var index = parseInt(m[1], 10);
                        if (_this.restartCount < index + 1 || _this.getAdditionalSkill(index) === null)
                            return wholeTotal;
                        else
                            skills = SkillSimulator.MonsterDB.skillLines[_this.getAdditionalSkill(index)].skills;
                    }
                    else {
                        skills = SkillSimulator.MonsterDB.skillLines[skillLineId].skills;
                    }
                    var cur = skills.filter(function (skill) {
                        return skill.pt <= _this.skillPts[skillLineId];
                    }).reduce(function (skillLineTotal, skill) {
                        return skillLineTotal + (skill[status] || 0);
                    }, 0);
                    return wholeTotal + cur;
                }, 0);
            };
            ;
            //データをビット列にシリアル化
            MonsterUnit.prototype.serialize = function () {
                var _this = this;
                var numToBitArray = Base64forBit.numToBitArray;
                var bitArray = [];
                bitArray = bitArray.concat(numToBitArray(this.data.id, SkillSimulator.BITS_MONSTER_TYPE));
                bitArray = bitArray.concat(numToBitArray(this.level, SkillSimulator.BITS_LEVEL));
                bitArray = bitArray.concat(numToBitArray(this.restartCount, SkillSimulator.BITS_RESTART_COUNT));
                //スキル
                bitArray = Object.keys(this.skillPts).reduce(function (prev, skillLineId) {
                    return prev.concat(numToBitArray(_this.skillPts[skillLineId], SkillSimulator.BITS_SKILL));
                }, bitArray);
                //転生追加スキル種類
                for (var i = 0; i < SkillSimulator.ADDITIONAL_SKILL_MAX; i++) {
                    var additionalSkillId = 0;
                    SkillSimulator.MonsterDB.additionalSkillLines.some(function (additionalSkillLine) {
                        if (_this.additionalSkills[i] == additionalSkillLine.name) {
                            additionalSkillId = additionalSkillLine.id;
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    bitArray = bitArray.concat(numToBitArray(additionalSkillId, SkillSimulator.BITS_ADDITIONAL_SKILL));
                }
                //バッジ
                for (i = 0; i < SkillSimulator.BADGE_COUNT; i++) {
                    var badgeIdNum = this.badgeEquip[i] === null ? 0 : parseInt(this.badgeEquip[i], 10);
                    bitArray = bitArray.concat(numToBitArray(badgeIdNum, SkillSimulator.BITS_BADGE));
                }
                //なつき度
                bitArray = bitArray.concat(numToBitArray(this.natsuki, SkillSimulator.BITS_NATSUKI));
                return bitArray;
            };
            ;
            //ビット列からデータを復元
            MonsterUnit.deserialize = function (bitArray, idnum) {
                var bitArrayToNum = Base64forBit.bitArrayToNum;
                var monster;
                var monsterTypeId = bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_MONSTER_TYPE));
                for (var monsterType in SkillSimulator.MonsterDB.monsters) {
                    if (monsterTypeId == SkillSimulator.MonsterDB.monsters[monsterType].id) {
                        monster = new MonsterUnit(monsterType, idnum);
                        break;
                    }
                }
                if (monster === undefined)
                    return null;
                monster.updateLevel(bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_LEVEL)));
                monster.updateRestartCount(bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_RESTART_COUNT)));
                //スキル
                for (var skillLine in monster.skillPts)
                    monster.updateSkillPt(skillLine, bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_SKILL)));
                //転生追加スキル種類
                for (var i = 0; i < SkillSimulator.ADDITIONAL_SKILL_MAX; i++) {
                    var additionalSkillId = bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_ADDITIONAL_SKILL));
                    if (additionalSkillId === 0) {
                        monster.updateAdditionalSkill(i, null);
                        continue;
                    }
                    for (var j = 0; j < SkillSimulator.MonsterDB.additionalSkillLines.length; j++) {
                        if (additionalSkillId == SkillSimulator.MonsterDB.additionalSkillLines[j].id) {
                            monster.updateAdditionalSkill(i, SkillSimulator.MonsterDB.additionalSkillLines[j].name);
                            break;
                        }
                    }
                }
                //バッジ
                if (bitArray.length >= SkillSimulator.BITS_BADGE * SkillSimulator.BADGE_COUNT) {
                    var badgeIdStr;
                    for (i = 0; i < SkillSimulator.BADGE_COUNT; i++) {
                        var badgeId = bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_BADGE));
                        if (badgeId === 0) {
                            badgeIdStr = null;
                        }
                        else {
                            //0補間
                            badgeIdStr = '00' + badgeId.toString();
                            badgeIdStr = badgeIdStr.substring(badgeIdStr.length - 3);
                        }
                        monster.badgeEquip[i] = badgeIdStr;
                    }
                }
                //なつき度
                if (bitArray.length >= SkillSimulator.BITS_NATSUKI) {
                    var natsuki = bitArrayToNum(bitArray.splice(0, SkillSimulator.BITS_NATSUKI));
                    monster.updateNatsuki(natsuki);
                }
                else {
                    monster.updateNatsuki(0);
                }
                return monster;
            };
            ;
            return MonsterUnit;
        })();
        SkillSimulator.MonsterUnit = MonsterUnit;
        var Base64forBit = (function () {
            function Base64forBit() {
            }
            Base64forBit.encode = function (bitArray) {
                for (var i = (bitArray.length - 1) % this.BITS_ENCODE + 1; i < this.BITS_ENCODE; i++)
                    bitArray.push(0); //末尾0補完
                var base64str = '';
                while (bitArray.length > 0) {
                    base64str += this.EN_CHAR.charAt(this.bitArrayToNum(bitArray.splice(0, this.BITS_ENCODE)));
                }
                return base64str;
            };
            Base64forBit.decode = function (base64str) {
                var bitArray = [];
                for (var i = 0; i < base64str.length; i++) {
                    bitArray = bitArray.concat(this.numToBitArray(this.EN_CHAR.indexOf(base64str.charAt(i)), this.BITS_ENCODE));
                }
                return bitArray;
            };
            Base64forBit.bitArrayToNum = function (bitArray) {
                var num = 0;
                for (var i = 0; i < bitArray.length; i++) {
                    num = num << 1 | bitArray[i];
                }
                return num;
            };
            Base64forBit.numToBitArray = function (num, digits) {
                var bitArray = [];
                for (var i = digits - 1; i >= 0; i--) {
                    bitArray.push(num >> i & 1);
                }
                return bitArray;
            };
            Base64forBit.EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
            Base64forBit.BITS_ENCODE = 6; //6ビットごとに区切ってエンコード
            return Base64forBit;
        })();
        SkillSimulator.Base64forBit = Base64forBit;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var EventDispatcher = (function () {
            function EventDispatcher() {
                this.events = {};
            }
            EventDispatcher.prototype.dispatch = function (eventName) {
                var _this = this;
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                if (this.events[eventName] === undefined) {
                    return;
                }
                this.events[eventName].forEach(function (listener) {
                    listener.apply(_this, args);
                });
            };
            EventDispatcher.prototype.on = function (eventName, listener) {
                if (this.events[eventName] === undefined) {
                    this.events[eventName] = [];
                }
                this.events[eventName].push(listener);
            };
            EventDispatcher.prototype.off = function (eventName, listener) {
                if (this.events[eventName] === undefined) {
                    return;
                }
                var i = this.events[eventName].indexOf(listener);
                if (i >= 0) {
                    this.events[eventName].splice(i, 1);
                }
            };
            return EventDispatcher;
        })();
        SkillSimulator.EventDispatcher = EventDispatcher;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/// <reference path="eventdispatcher.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var UNDO_MAX = 20;
        var CommandManager = (function (_super) {
            __extends(CommandManager, _super);
            function CommandManager() {
                _super.apply(this, arguments);
                this.commandStack = [];
                this.cursor = 0;
            }
            CommandManager.prototype.invoke = function (command) {
                var succeeded = command.execute();
                if (!succeeded)
                    return false;
                //イベント発行
                if (command.event !== undefined)
                    this.dispatch.apply(this, [command.event().name].concat(command.event().args));
                //以降のスタックを切捨て
                this.commandStack.splice(this.cursor);
                if (this.cursor >= 1 && this.commandStack[this.cursor - 1].isAbsorbable(command)) {
                    //連続した同種の操作ならひとつの操作にまとめる
                    this.commandStack[this.cursor - 1].absorb(command);
                }
                else {
                    this.commandStack.push(command);
                    this.cursor++;
                }
                if (this.commandStack.length > UNDO_MAX) {
                    this.commandStack.shift();
                    this.cursor--;
                }
                this.dispatch('CommandStackChanged');
                return true;
            };
            CommandManager.prototype.undo = function () {
                if (!this.isUndoable())
                    return;
                this.cursor--;
                var command = this.commandStack[this.cursor];
                command.undo();
                //イベント発行: undoEvent()が定義されていればそちらを優先
                var event = null;
                if (command.undoEvent !== undefined) {
                    event = command.undoEvent();
                }
                else if (command.event !== undefined) {
                    event = command.event();
                }
                if (event !== null)
                    this.dispatch.apply(this, [event.name].concat(event.args));
                this.dispatch('CommandStackChanged');
            };
            CommandManager.prototype.redo = function () {
                if (!this.isRedoable())
                    return;
                var command = this.commandStack[this.cursor];
                command.execute();
                if (command.event !== undefined)
                    this.dispatch.apply(this, [command.event().name].concat(command.event().args));
                this.cursor++;
                this.dispatch('CommandStackChanged');
            };
            CommandManager.prototype.isUndoable = function () {
                return (this.cursor > 0);
            };
            CommandManager.prototype.isRedoable = function () {
                return (this.cursor < this.commandStack.length);
            };
            return CommandManager;
        })(SkillSimulator.EventDispatcher);
        SkillSimulator.CommandManager = CommandManager;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-monster-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var SingleValueCommand = (function () {
            function SingleValueCommand(monsterId, newValue) {
                this.prevValue = undefined;
                this.name = 'SingleValueCommand';
                this.monsterId = monsterId;
                this.newValue = newValue;
            }
            SingleValueCommand.prototype.isAbsorbable = function (command) {
                return this.name === command.name &&
                    (this.monsterId === undefined || this.monsterId === command.monsterId) &&
                    (this.skillLineId === undefined || this.skillLineId === command.skillLineId);
            };
            SingleValueCommand.prototype.absorb = function (newCommand) {
                this.newValue = newCommand.newValue;
            };
            return SingleValueCommand;
        })();
        //エントリ追加
        var AddMonster = (function () {
            function AddMonster(monsterType) {
                this.name = "AddMonster";
                this.monsterType = monsterType;
            }
            AddMonster.prototype.execute = function () {
                var newMonster = SkillSimulator.Simulator.addMonster(this.monsterType);
                if (newMonster) {
                    this.monsterId = newMonster.id;
                    this.newMonster = newMonster;
                }
                return !!newMonster;
            };
            AddMonster.prototype.undo = function () {
                SkillSimulator.Simulator.deleteMonster(this.monsterId);
            };
            AddMonster.prototype.isAbsorbable = function (command) { return false; };
            AddMonster.prototype.absorb = function () { };
            AddMonster.prototype.event = function () {
                return {
                    name: 'MonsterAppended',
                    args: [this.newMonster]
                };
            };
            AddMonster.prototype.undoEvent = function () {
                return {
                    name: 'MonsterRemoved',
                    args: [this.newMonster]
                };
            };
            return AddMonster;
        })();
        //エントリ削除
        var DeleteMonster = (function () {
            function DeleteMonster(monsterId) {
                this.name = "DeleteMonster";
                this.monsterId = monsterId;
            }
            DeleteMonster.prototype.execute = function () {
                this.deletedIndex = SkillSimulator.Simulator.indexOf(this.monsterId);
                var deleted = SkillSimulator.Simulator.deleteMonster(this.monsterId);
                if (deleted) {
                    this.deletedMonster = deleted;
                }
                return !!deleted;
            };
            DeleteMonster.prototype.undo = function () {
                SkillSimulator.Simulator.monsters.splice(this.deletedIndex, 0, this.deletedMonster);
            };
            DeleteMonster.prototype.isAbsorbable = function (command) { return false; };
            DeleteMonster.prototype.absorb = function () { };
            DeleteMonster.prototype.event = function () {
                return {
                    name: 'MonsterRemoved',
                    args: [this.deletedMonster]
                };
            };
            DeleteMonster.prototype.undoEvent = function () {
                return {
                    name: 'MonsterAppended',
                    args: [this.deletedMonster, this.deletedIndex]
                };
            };
            return DeleteMonster;
        })();
        var SimulatorCommandManager = (function (_super) {
            __extends(SimulatorCommandManager, _super);
            function SimulatorCommandManager() {
                _super.apply(this, arguments);
            }
            SimulatorCommandManager.prototype.addMonster = function (monsterType) {
                return this.invoke(new AddMonster(monsterType));
            };
            SimulatorCommandManager.prototype.deleteMonster = function (monsterId) {
                return this.invoke(new DeleteMonster(monsterId));
            };
            return SimulatorCommandManager;
        })(SkillSimulator.CommandManager);
        SkillSimulator.SimulatorCommandManager = SimulatorCommandManager;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />
/// <reference path="typings/dq10skill.d.ts" />
/// <reference path="dq10skill-monster-monster.ts" />
/// <reference path="dq10skill-monster-command.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        SkillSimulator.MONSTER_MAX = 8;
        SkillSimulator.BASIC_SKILL_COUNT = 3;
        SkillSimulator.ADDITIONAL_SKILL_MAX = 2;
        SkillSimulator.BADGE_COUNT = 4;
        //ビット数定義
        SkillSimulator.BITS_MONSTER_TYPE = 6;
        SkillSimulator.BITS_LEVEL = 8;
        SkillSimulator.BITS_RESTART_COUNT = 4;
        SkillSimulator.BITS_SKILL = 6;
        SkillSimulator.BITS_ADDITIONAL_SKILL = 6;
        SkillSimulator.BITS_BADGE = 10;
        SkillSimulator.BITS_NATSUKI = 4;
        SkillSimulator.bitDataLength = SkillSimulator.BITS_MONSTER_TYPE +
            SkillSimulator.BITS_LEVEL +
            SkillSimulator.BITS_RESTART_COUNT +
            SkillSimulator.BITS_SKILL * (SkillSimulator.BASIC_SKILL_COUNT + SkillSimulator.ADDITIONAL_SKILL_MAX) +
            SkillSimulator.BITS_ADDITIONAL_SKILL * SkillSimulator.ADDITIONAL_SKILL_MAX; // +
        //BITS_BADGE * BADGE_COUNT;
        var SimulatorModel = (function () {
            function SimulatorModel() {
                //パラメータ格納用
                this.monsters = [];
                //モンスターID管理
                this.lastId = 0;
            }
            /* メソッド */
            //モンスター追加
            SimulatorModel.prototype.addMonster = function (monsterType, index) {
                if (this.monsters.length >= SkillSimulator.MONSTER_MAX)
                    return null;
                var newMonster = new SkillSimulator.MonsterUnit(monsterType, this.lastId++);
                if (index === undefined)
                    this.monsters.push(newMonster);
                else
                    this.monsters.splice(index, 0, newMonster);
                return newMonster;
            };
            //IDからモンスター取得
            SimulatorModel.prototype.getMonster = function (monsterId) {
                return this.monsters[this.indexOf(monsterId)];
            };
            //指定IDのモンスター削除
            SimulatorModel.prototype.deleteMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i !== null)
                    return this.monsters.splice(i, 1)[0];
                else
                    return false;
            };
            //指定IDのモンスターをひとつ下に並び替える
            SimulatorModel.prototype.movedownMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i > this.monsters.length)
                    return;
                this.monsters.splice(i, 2, this.monsters[i + 1], this.monsters[i]);
            };
            //指定IDのモンスターをひとつ上に並び替える
            SimulatorModel.prototype.moveupMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i < 0)
                    return;
                this.monsters.splice(i - 1, 2, this.monsters[i], this.monsters[i - 1]);
            };
            SimulatorModel.prototype.indexOf = function (monsterId) {
                for (var i = 0; i < this.monsters.length; i++) {
                    if (this.monsters[i].id == monsterId)
                        return i;
                }
                return null;
            };
            SimulatorModel.prototype.generateQueryString = function () {
                var query = [];
                this.monsters.forEach(function (monster) {
                    query.push(SkillSimulator.Base64forBit.encode(monster.serialize()));
                    query.push(Base64.encode(monster.indivName, true));
                });
                return query.join(';');
            };
            SimulatorModel.prototype.applyQueryString = function (queryString) {
                var query = queryString.split(';');
                while (query.length > 0) {
                    var newMonster = SkillSimulator.MonsterUnit.deserialize(SkillSimulator.Base64forBit.decode(query.shift()), this.lastId++);
                    newMonster.updateIndividualName(Base64.decode(query.shift()));
                    this.monsters.push(newMonster);
                }
            };
            SimulatorModel.prototype.validateQueryString = function (queryString) {
                if (!queryString.match(/^[A-Za-z0-9-_;]+$/))
                    return false;
                var query = queryString.split(';');
                if (query.length % 2 == 1)
                    return false;
                return query.every(function (q) {
                    return (q.length * SkillSimulator.Base64forBit.BITS_ENCODE >= SkillSimulator.bitDataLength);
                });
            };
            return SimulatorModel;
        })();
        SkillSimulator.SimulatorModel = SimulatorModel;
        /* UI */
        var SimulatorUI = (function () {
            function SimulatorUI(sim) {
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.sim = SkillSimulator.Simulator;
                this.com = new SkillSimulator.SimulatorCommandManager();
                this.sim = sim;
                this.DB = SkillSimulator.MonsterDB;
            }
            //モンスターのエントリ追加
            SimulatorUI.prototype.drawMonsterEntry = function (monster) {
                var _this = this;
                var $ent = $('#monster_dummy').clone()
                    .attr('id', monster.id)
                    .css('display', 'block');
                $ent.find('.monstertype').text(monster.data.name);
                $ent.find('[id$=-dummy]').each(function (i, elem) {
                    var dummyId = $(elem).attr('id');
                    var newId = dummyId.replace('-dummy', '-' + monster.id);
                    $(elem).attr('id', newId);
                    $ent.find('label[for=' + dummyId + ']').attr('for', newId);
                });
                $ent.find('.indiv_name input').val(monster.indivName);
                var skillLine, $table, $skillContainer = $ent.find('.skill_tables');
                monster.data.skillLines.forEach(function (skillLine) {
                    $table = _this.drawSkillTable(skillLine);
                    $skillContainer.append($table);
                });
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    skillLine = 'additional' + s.toString();
                    $table = this.drawSkillTable(skillLine);
                    if (monster.restartCount < s + 1 || monster.getAdditionalSkill(s) === null)
                        $table.hide();
                    $skillContainer.append($table);
                }
                return $ent;
            };
            SimulatorUI.prototype.drawSkillTable = function (skillLineId) {
                var $table = $('<table />').addClass(skillLineId).addClass('skill_table');
                $table.append('<caption><span class="skill_line_name">' +
                    this.DB.skillLines[skillLineId].name +
                    '</span>: <span class="skill_total">0</span></caption>')
                    .append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');
                this.DB.skillLines[skillLineId].skills.forEach(function (skill, s) {
                    $('<tr />').addClass([skillLineId, s].join('_'))
                        .append('<td class="skill_pt">' + skill.pt + '</td>')
                        .append('<td class="skill_name">' + skill.name + '</td>')
                        .appendTo($table);
                });
                return $table;
            };
            SimulatorUI.prototype.refreshEntry = function (monsterId) {
                var _this = this;
                this.refreshAdditionalSkillSelector(monsterId);
                this.refreshAdditionalSkill(monsterId);
                this.refreshMonsterInfo(monsterId);
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) {
                    return _this.refreshSkillList(monsterId, skillLineId);
                });
                this.refreshTotalStatus(monsterId);
                this.refreshControls(monsterId);
                this.refreshBadgeButtons(monsterId);
                this.refreshSaveUrl();
            };
            SimulatorUI.prototype.refreshAll = function () {
                var _this = this;
                this.sim.monsters.forEach(function (monster) { return _this.refreshEntry(monster.id); });
            };
            SimulatorUI.prototype.refreshMonsterInfo = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                var currentLevel = monster.getLevel();
                var requiredLevel = monster.requiredLevel();
                //見出し中のレベル数値
                $("#" + monsterId + " .lv_h2").text(currentLevel);
                if (monster.getRestartCount() > 0)
                    $("#" + monsterId + " .lv_h2").append('<small> + ' + monster.getRestartCount() + '</small>');
                var $levelH2 = $("#" + monsterId + " h2");
                //必要経験値
                $("#" + monsterId + " .exp").text(numToFormedStr(monster.requiredExp(currentLevel)));
                var additionalExp = monster.additionalExp();
                if (additionalExp > 0)
                    $("#" + monsterId + " .exp").append('<small> + ' + numToFormedStr(additionalExp) + '</small>');
                //スキルポイント 残り / 最大値
                var maxSkillPts = monster.maxSkillPts();
                var restartSkillPts = monster.getRestartSkillPt();
                var natsukiSkillPts = monster.getNatsukiSkillPts();
                var remainingSkillPts = maxSkillPts + restartSkillPts + natsukiSkillPts - monster.totalSkillPts();
                var $skillPtsText = $("#" + monsterId + " .pts");
                $skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
                if (restartSkillPts > 0)
                    $skillPtsText.append('<small> +' + restartSkillPts + '</small>');
                if (natsukiSkillPts > 0)
                    $skillPtsText.append('<small> +' + natsukiSkillPts + '</small>');
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $("#" + monsterId + " .error").toggle(isLevelError);
                if (isLevelError) {
                    $("#" + monsterId + " .req_lv").text(numToFormedStr(requiredLevel));
                    $("#" + monsterId + " .exp_remain").text(numToFormedStr(monster.requiredExpRemain()));
                }
            };
            SimulatorUI.prototype.refreshSkillList = function (monsterId, skillLineId) {
                var _this = this;
                $("#" + monsterId + " tr[class^=" + skillLineId + "_]").removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
                var monster = this.sim.getMonster(monsterId);
                var skillPt = monster.getSkillPt(skillLineId);
                var skills = this.DB.skillLines[skillLineId].skills;
                this.DB.skillLines[skillLineId].skills.some(function (skill, s) {
                    if (skillPt < skill.pt)
                        return true;
                    $("#" + monsterId + " ." + skillLineId + "_" + s).addClass(_this.CLASSNAME_SKILL_ENABLED);
                    return false;
                });
                $("#" + monsterId + " ." + skillLineId + " .skill_total").text(skillPt);
            };
            SimulatorUI.prototype.refreshControls = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                $("#" + monsterId + " .lv_select>select").val(monster.getLevel());
                $("#" + monsterId + " .restart_count").val(monster.getRestartCount());
                Object.keys(monster.skillPts).forEach(function (skillLineId) {
                    $("#" + monsterId + " ." + skillLineId + " .ptspinner").spinner('value', monster.getSkillPt(skillLineId));
                });
                $("#" + monsterId + " .natsuki-selector>select").val(monster.getNatsuki());
            };
            SimulatorUI.prototype.refreshSaveUrl = function () {
                var queryString = this.sim.generateQueryString();
                if (queryString.length === 0) {
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
            };
            SimulatorUI.prototype.refreshAdditionalSkillSelector = function (monsterId) {
                var _this = this;
                var monster = this.sim.getMonster(monsterId);
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    $("#" + monsterId + " .additional_skill_selector-" + s).toggle(monster.restartCount > s);
                }
                $("#" + monsterId + " .additional_skill_selector select").empty();
                if (monster.restartCount >= 1) {
                    this.DB.additionalSkillLines.forEach(function (additionalSkillData) {
                        var skillData = _this.DB.skillLines[additionalSkillData.name];
                        if (monster.restartCount >= additionalSkillData.restartCount &&
                            (!additionalSkillData.occupied ||
                                additionalSkillData.occupied.indexOf(monster.monsterType) >= 0)) {
                            $("#" + monsterId + " .additional_skill_selector select").append($('<option />').val(additionalSkillData.name).text(skillData.name));
                        }
                    });
                }
                for (s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    $("#" + monsterId + " .additional_skill_selector-" + s + " select").val(monster.getAdditionalSkill(s));
                }
            };
            SimulatorUI.prototype.refreshAdditionalSkill = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                var $table;
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    $table = $("#" + monsterId + " .additional" + s);
                    if (monster.restartCount >= s + 1 && monster.getAdditionalSkill(s) !== null) {
                        this.refreshAdditionalSkillTable($table, monster.getAdditionalSkill(s));
                        $table.show();
                    }
                    else {
                        $table.hide();
                    }
                }
            };
            SimulatorUI.prototype.refreshAdditionalSkillTable = function ($table, newSkillLine) {
                var _this = this;
                var data = this.DB.skillLines[newSkillLine];
                var tableClass = $table.attr('class').split(' ')[0];
                $table.find('caption .skill_line_name').text(data.name);
                data.skills.forEach(function (skill, i) {
                    var $tr = $table.find("tr." + tableClass + "_" + i);
                    var hintText = _this.getHintText(skill);
                    $tr.attr('title', hintText);
                    $tr.children('.skill_pt').text(skill.pt);
                    $tr.children('.skill_name').text(skill.name);
                });
            };
            SimulatorUI.prototype.refreshTotalStatus = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                var statusArray = 'maxhp,maxmp,atk,pow,def,magic,heal,spd,dex,charm,weight'.split(',');
                var $cont = $("#" + monsterId + " .status_info dl");
                statusArray.forEach(function (status) {
                    $cont.find('.' + status).text(monster.getTotalStatus(status));
                });
            };
            SimulatorUI.prototype.drawBadgeButton = function (monsterId, badgeIndex) {
                var monster = this.sim.getMonster(monsterId);
                var $badgeButton = $("#append-badge" + badgeIndex + "-" + monsterId);
                var $badgeButtonCont = $badgeButton.closest('li');
                var badgeId = monster.badgeEquip[badgeIndex];
                var badge = badgeId ? this.DB.badges[badgeId] : null;
                var buttonText = '';
                var buttonHintText = '';
                if (badge) {
                    buttonText = badgeId + ' ' + badge.name + '・' + this.DB.badgerarity[badge.rarity];
                    buttonHintText = this.badgeSelector.getFeatureCache(badgeId).join("\n");
                }
                else {
                    if (badgeIndex == monster.badgeEquip.length - 1)
                        buttonText = 'スペシャルバッジ';
                    else
                        buttonText = 'バッジ' + (badgeIndex + 1).toString();
                }
                $badgeButton.text(buttonText).attr('title', buttonHintText);
                var rarityClass = badge === null ? 'blank' : badge.rarity;
                $badgeButtonCont.toggleClass('blank', rarityClass == 'blank');
                Object.keys(this.DB.badgerarity).forEach(function (rarity) {
                    $badgeButtonCont.toggleClass(rarity, rarityClass == rarity);
                });
            };
            SimulatorUI.prototype.refreshBadgeButtons = function (monsterId) {
                for (var i = 0; i < SkillSimulator.BADGE_COUNT; i++)
                    this.drawBadgeButton(monsterId, i);
            };
            SimulatorUI.prototype.getCurrentMonsterId = function (currentNode) {
                return $(currentNode).parents('.monster_ent').attr('id');
            };
            SimulatorUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimulatorUI.prototype.getHintText = function (skill) {
                var hintText = skill.desc || '';
                if ((skill.mp !== null) && (skill.mp !== undefined))
                    hintText += "\n\uFF08\u6D88\u8CBBMP: " + skill.mp + "\uFF09";
                if ((skill.charge !== null) && (skill.charge !== undefined))
                    hintText += "\n\uFF08\u30C1\u30E3\u30FC\u30B8: " + skill.charge + "\u79D2\uFF09";
                if (skill.gold)
                    hintText += "\n\uFF08" + skill.gold + "G\uFF09";
                return hintText;
            };
            SimulatorUI.prototype.setupEntry = function (monsterId) {
                var _this = this;
                var $ent = $('#' + monsterId);
                //レベル選択セレクトボックス項目設定
                var $select = $ent.find('.lv_select>select');
                for (var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
                    $select.append($("<option />").val(i).text(i + " (" + this.DB.skillPtsGiven[i] + ")"));
                }
                //レベル選択セレクトボックス変更時
                $select.change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    _this.sim.getMonster(monsterId).updateLevel($(e.currentTarget).val());
                    _this.refreshMonsterInfo(monsterId);
                    //refreshSaveUrl();
                });
                //レベル転生回数スピンボタン設定
                var $spinner = $ent.find('.restart_count');
                $spinner.spinner({
                    min: this.DB.consts.restart.min,
                    max: this.DB.consts.restart.max,
                    spin: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var monster = _this.sim.getMonster(monsterId);
                        if (monster.updateRestartCount(ui.value)) {
                            _this.refreshAdditionalSkillSelector(monsterId);
                            _this.refreshAdditionalSkill(monsterId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                        }
                        else {
                            return false;
                        }
                    },
                    change: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var monster = _this.sim.getMonster(monsterId);
                        if (isNaN($(e.currentTarget).val())) {
                            $(e.currentTarget).val(monster.getRestartCount());
                            return false;
                        }
                        if (monster.updateRestartCount(parseInt($(e.currentTarget).val(), 10))) {
                            _this.refreshAdditionalSkillSelector(monsterId);
                            _this.refreshAdditionalSkill(monsterId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            _this.refreshSaveUrl();
                        }
                        else {
                            $(e.currentTarget).val(monster.getRestartCount());
                            return false;
                        }
                    },
                    stop: function (e, ui) {
                        _this.refreshSaveUrl();
                    }
                });
                //スピンボタン設定
                $spinner = $ent.find('.ptspinner');
                $spinner.spinner({
                    min: this.DB.consts.skillPts.min,
                    max: this.DB.consts.skillPts.max,
                    spin: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                        if (_this.sim.getMonster(monsterId).updateSkillPt(skillLineId, ui.value)) {
                            _this.refreshSkillList(monsterId, skillLineId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            e.stopPropagation();
                        }
                        else {
                            return false;
                        }
                    },
                    change: function (e, ui) {
                        var target = e.currentTarget || e.target;
                        var monsterId = _this.getCurrentMonsterId(target);
                        var skillLineId = _this.getCurrentSkillLine(target);
                        var monster = _this.sim.getMonster(monsterId);
                        if (isNaN($(target).val())) {
                            $(target).val(monster.getSkillPt(skillLineId));
                            return false;
                        }
                        if (monster.updateSkillPt(skillLineId, parseInt($(target).val(), 10))) {
                            _this.refreshSkillList(monsterId, skillLineId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            _this.refreshSaveUrl();
                        }
                        else {
                            $(target).val(monster.getSkillPt(skillLineId));
                            return false;
                        }
                    },
                    stop: function (e, ui) {
                        _this.refreshSaveUrl();
                    }
                });
                //テキストボックスクリック時数値を選択状態に
                $spinner.click(function (e) {
                    $(e.currentTarget).select();
                });
                //テキストボックスでEnter押下時更新して選択状態に
                $spinner.keypress(function (e) {
                    if (e.which == 13) {
                        $('#url_text').focus();
                        $(e.currentTarget).focus().select();
                    }
                });
                //リセットボタン設定
                $ent.find('.reset').button({
                    icons: { primary: 'ui-icon-refresh' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    monster.updateSkillPt(skillLineId, 0);
                    $("#" + monsterId + " ." + skillLineId + " .ptspinner").spinner('value', monster.getSkillPt(skillLineId));
                    _this.refreshSkillList(monsterId, skillLineId);
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshTotalStatus(monsterId);
                    _this.refreshSaveUrl();
                });
                //スキルテーブル項目クリック時
                $ent.find('.skill_table tr[class]').click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                    var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);
                    var monster = _this.sim.getMonster(monsterId);
                    var requiredPt = _this.DB.skillLines[skillLineId].skills[skillIndex].pt;
                    monster.updateSkillPt(skillLineId, requiredPt);
                    $("#" + monsterId + " ." + skillLineId + " .ptspinner").spinner('value', monster.getSkillPt(skillLineId));
                    _this.refreshSkillList(monsterId, skillLineId);
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshTotalStatus(monsterId);
                    _this.refreshSaveUrl();
                });
                //おりたたむ・ひろげるボタン設定
                var HEIGHT_FOLDED = '4.8em';
                var HEIGHT_UNFOLDED = $ent.height() + 'px';
                var CLASSNAME_FOLDED = 'folded';
                $ent.find('.toggle_ent').button({
                    icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                    text: false,
                    label: 'おりたたむ'
                }).click(function (e) {
                    var $entry = $(e.currentTarget).parents('.monster_ent');
                    $entry.toggleClass(CLASSNAME_FOLDED);
                    if ($entry.hasClass(CLASSNAME_FOLDED)) {
                        $entry.animate({ height: HEIGHT_FOLDED });
                        $(e.currentTarget).button('option', {
                            icons: { primary: 'ui-icon-arrowthickstop-1-s' },
                            label: 'ひろげる'
                        });
                    }
                    else {
                        $entry.animate({ height: HEIGHT_UNFOLDED });
                        $(e.currentTarget).button('option', {
                            icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                            label: 'おりたたむ'
                        });
                    }
                });
                //ヒントテキスト設定
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) {
                    _this.DB.skillLines[skillLineId].skills.forEach(function (skill, i) {
                        var hintText = _this.getHintText(skill);
                        $("." + skillLineId + "_" + i).attr('title', hintText);
                    });
                });
                //削除ボタン
                $ent.find('.delete_entry').button({
                    icons: { primary: 'ui-icon-close' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    var additionalLevel = '';
                    if (monster.getRestartCount() > 0)
                        additionalLevel = "(+" + monster.getRestartCount() + ")";
                    var message = monster.data.name +
                        ' Lv' + monster.getLevel().toString() + additionalLevel +
                        ("\u300C" + monster.getIndividualName() + "\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u3002") +
                        '\nよろしいですか？';
                    if (!window.confirm(message))
                        return;
                    _this.com.deleteMonster(monsterId);
                });
                //下へボタン
                $ent.find('.movedown').button({
                    icons: { primary: 'ui-icon-triangle-1-s' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var $ent = $('#' + monsterId);
                    if ($ent.next().length === 0)
                        return;
                    var zIndex = $ent.css('z-index');
                    var pos = $ent.position();
                    $ent.css({ position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1 });
                    $ent.animate({ top: $ent.next().position().top + $ent.next().height() }, function () {
                        $ent.insertAfter($ent.next());
                        $ent.css({ position: 'relative', top: 0, left: 0, 'z-index': zIndex });
                        _this.sim.movedownMonster(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //上へボタン
                $ent.find('.moveup').button({
                    icons: { primary: 'ui-icon-triangle-1-n' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var $ent = $('#' + monsterId);
                    if ($ent.prev().length === 0)
                        return;
                    var zIndex = $ent.css('z-index');
                    var pos = $ent.position();
                    $ent.css({ position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1 });
                    $ent.animate({ top: $ent.prev().position().top }, function () {
                        $ent.insertBefore($ent.prev());
                        $ent.css({ position: 'relative', top: 0, left: 0, 'z-index': zIndex });
                        _this.sim.moveupMonster(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //個体名テキストボックス
                $ent.find('.indiv_name input').change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    monster.updateIndividualName($(e.currentTarget).val());
                    _this.refreshSaveUrl();
                });
                //転生追加スキルセレクトボックス
                $ent.find('.additional_skill_selector select').change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    var selectorId = parseInt($(e.currentTarget).attr('id').match(/^select-additional(\d+)-/)[1]);
                    if (monster.updateAdditionalSkill(selectorId, $(e.currentTarget).val())) {
                        _this.refreshAdditionalSkill(monsterId);
                        _this.refreshMonsterInfo(monsterId);
                        _this.refreshTotalStatus(monsterId);
                        _this.refreshSaveUrl();
                    }
                    else {
                        $(e.currentTarget).val(monster.getAdditionalSkill(selectorId));
                        return false;
                    }
                });
                //バッジ選択ボタン
                $ent.find('.badge-button-container a').click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var badgeIndex = parseInt($(e.currentTarget).attr('id').match(/^append-badge(\d+)-/)[1], 10);
                    _this.badgeSelector.setCurrentMonster(_this.sim.getMonster(monsterId), badgeIndex);
                    _this.badgeSelector.show(function (badgeId) {
                        _this.sim.getMonster(monsterId).badgeEquip[badgeIndex] = badgeId;
                        _this.drawBadgeButton(monsterId, badgeIndex);
                        _this.refreshTotalStatus(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //なつき度選択セレクトボックス
                var $natsukiSelect = $ent.find('.natsuki-selector>select');
                this.DB.natsukiPts.forEach(function (natukiData, i) {
                    $natsukiSelect.append($("<option />").val(i).text(natukiData.natsukido.toString() + '(' + natukiData.pt.toString() + ')'));
                });
                //なつき度選択セレクトボックス変更時
                $natsukiSelect.change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    monster.updateNatsuki(parseInt($(e.currentTarget).val()));
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshSaveUrl();
                });
            };
            SimulatorUI.prototype.setupConsole = function () {
                var _this = this;
                //URLテキストボックスクリック時
                $('#url_text').click(function (e) {
                    $(e.currentTarget).select();
                });
                //保存用URLツイートボタン設定
                $('#tw-saveurl').button().click(function (e) {
                    if ($(e.currentTarget).attr('href') === '')
                        return false;
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
                    var windowParam = $.map(windowParams, function (val, key) { return key + '=' + val; }).join(',');
                    window.open(e.currentTarget.href, null, windowParam);
                    return false;
                });
                //すべておりたたむ・すべてひろげるボタン
                var CLASSNAME_FOLDED = 'folded';
                $('#fold-all').click(function (e) {
                    $('.monster_ent:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
                    $('body, html').animate({ scrollTop: 0 });
                });
                $('#unfold-all').click(function (e) {
                    $('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
                    $('body, html').animate({ scrollTop: 0 });
                });
                //レベル一括設定
                //セレクトボックス初期化
                var $select = $('#setalllevel>select');
                for (var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
                    $select.append($("<option />").val(i).text(i.toString()));
                }
                $select.val(this.DB.consts.level.max);
                $('#setalllevel>button').button().click(function (e) {
                    _this.sim.monsters.forEach(function (monster) { return monster.updateLevel($select.val()); });
                    _this.refreshAll();
                });
                $('.appendbuttons a').click(function (e) {
                    var monsterType = $(e.currentTarget).attr('id').replace('append-', '');
                    _this.com.addMonster(monsterType);
                });
            };
            SimulatorUI.prototype.setupEvents = function () {
                var _this = this;
                this.com.on('MonsterAppended', function (monster, index) {
                    $('#initial-instruction').hide();
                    $('#monsters').append(_this.drawMonsterEntry(monster));
                    _this.setupEntry(monster.id);
                    _this.refreshEntry(monster.id);
                    $('#' + monster.id + ' .indiv_name input').focus().select();
                });
                this.com.on('MonsterRemoved', function (monster) {
                    $('#' + monster.id).remove();
                    _this.refreshSaveUrl();
                    if (_this.sim.monsters.length === 0)
                        $('#initial-instruction').show();
                });
            };
            SimulatorUI.prototype.setupAll = function () {
                var _this = this;
                this.setupConsole();
                this.setupEvents();
                this.badgeSelector = new BadgeSelector();
                this.badgeSelector.setup();
                $('#monsters').empty();
                if (this.sim.monsters.length > 0)
                    $('#initial-instruction').hide();
                this.sim.monsters.forEach(function (monster) { return $('#monsters').append(_this.drawMonsterEntry(monster)); });
                this.setupEntry('monsters');
                this.refreshAll();
            };
            return SimulatorUI;
        })();
        //バッジ選択ダイアログ
        var BadgeSelector = (function () {
            function BadgeSelector() {
                this.dialogResult = false;
                this.selectedBadgeId = null;
                //バッジ効果リストのキャッシュ
                this.featureCache = {};
                //ソート順の昇降を保持
                this.sortByIdDesc = false;
                this.sortByKanaDesc = false;
                //モンスターデータを一部保持
                this.status = {};
                this.currentBadgeId = null;
                this.badgeEquip = [];
                this.STATUS_ARRAY = 'atk,def,maxhp,maxmp,magic,heal,spd,dex,stylish,weight'.split(',');
                this.DB = SkillSimulator.MonsterDB;
                this.badgeSearch = new BadgeSearch();
            }
            BadgeSelector.prototype.setup = function () {
                var _this = this;
                this.$dialog = $('#badge-selector');
                this.$maskScreen = $('#dark-screen');
                this.$maskScreen.click(function (e) {
                    _this.cancel();
                });
                //ヘッダー部ドラッグで画面移動可能
                this.$dialog.draggable({
                    handle: '#badge-selector-header',
                    cursor: 'move'
                });
                //バッジをはずすボタン
                $('#badge-selector-remove').click(function (e) {
                    _this.apply(null);
                }).hover(function (e) {
                    _this.clearBadgeInfo();
                    _this.refreshStatusAfter(null);
                });
                //バッジ設定ボタン
                $('#badge-selector-list a').click(function (e) {
                    var badgeId = _this.getBadgeId(e.currentTarget);
                    _this.apply(badgeId);
                }).hover(function (e) {
                    var badgeId = _this.getBadgeId(e.currentTarget);
                    _this.refreshBadgeInfo(badgeId);
                    _this.refreshStatusAfter(badgeId);
                });
                //バッジ検索ボタン
                $('#badge-search-buttons-race,' +
                    '#badge-search-buttons-rarity,' +
                    '#badge-search-buttons-feature').find('a').click(function (e) {
                    var searchKey = $(e.currentTarget).attr('data-search-key');
                    var filterType = $(e.currentTarget).attr('data-filter-type');
                    var isTurningOn = _this.badgeSearch.toggleSearch(filterType, searchKey);
                    _this.toggleSearchButtons(e.currentTarget, isTurningOn, (filterType == 'race' || filterType == 'rarity'));
                    _this.filterButtons(_this.badgeSearch.getIds());
                    if (isTurningOn && filterType == 'feature' && _this.DB.badgefeature[searchKey]['type'] == 'int') {
                        _this.sortBadgeByFeatureValue(searchKey, true);
                    }
                });
                //バッジソートボタン
                $('#badge-sort-badgeid').click(function (e) {
                    _this.sortBadgeById(_this.sortByIdDesc);
                    _this.sortByIdDesc = !_this.sortByIdDesc;
                    _this.sortByKanaDesc = false;
                });
                $('#badge-sort-kana').click(function (e) {
                    _this.sortBadgeByKana(_this.sortByKanaDesc);
                    _this.sortByKanaDesc = !_this.sortByKanaDesc;
                    _this.sortByIdDesc = false;
                });
                //検索クリアボタン
                $('#badge-search-clear').click(function (e) {
                    _this.clearFilter();
                });
            };
            BadgeSelector.prototype.getBadgeId = function (elem) {
                if (elem.tagName.toUpperCase() == 'LI')
                    elem = $(elem).find('a').get(0);
                if ($(elem).attr('id') == 'badge-selector-remove')
                    return null;
                else
                    return $(elem).attr('data-badge-id');
            };
            BadgeSelector.prototype.clearBadgeInfo = function () {
                $('#badge-selector-badge-id').text('');
                $('#badge-selector-badge-name').text('');
                $('#badge-selector-race').text('');
                $('#badge-selector-feature-list').empty();
            };
            BadgeSelector.prototype.refreshBadgeInfo = function (badgeId) {
                var badge = this.DB.badges[badgeId];
                if (!badge)
                    return;
                $('#badge-selector-badge-id').text(badgeId);
                var badgeName = badge.name + '・' + this.DB.badgerarity[badge.rarity];
                $('#badge-selector-badge-name').text(badgeName);
                var raceName;
                if (badge.race == 'special')
                    raceName = 'スペシャルバッジ';
                else
                    raceName = this.DB.badgerace[badge.race].name + '系';
                $('#badge-selector-race').text(raceName);
                var features = this.getFeatureCache(badgeId);
                var $featureList = $('#badge-selector-feature-list');
                $featureList.empty();
                features.forEach(function (feature) { return $('<li>').text(feature).appendTo($featureList); });
            };
            BadgeSelector.prototype.getFeatureCache = function (badgeId) {
                var _this = this;
                if (this.featureCache[badgeId])
                    return this.featureCache[badgeId];
                var badge = this.DB.badges[badgeId];
                var features = [];
                Object.keys(this.DB.badgefeature).forEach(function (f) {
                    var feature = _this.DB.badgefeature[f];
                    var val = badge[f];
                    if (val) {
                        switch (feature.type) {
                            case 'int':
                            case 'string':
                                if (feature.format)
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
                this.featureCache[badgeId] = features;
                return this.featureCache[badgeId];
                function getFeatureArrayFromArray(format, fromArray) {
                    return fromArray.map(function (ent) { return format.replace('@v', ent); });
                }
                function getFeatureArrayFromHash(format, fromHash) {
                    return Object.keys(fromHash).map(function (key) {
                        var value = fromHash[key];
                        return format.replace('@k', key).replace('@v', value);
                    });
                }
            };
            BadgeSelector.prototype.setCurrentMonster = function (monster, badgeIndex) {
                var _this = this;
                this.STATUS_ARRAY.forEach(function (s) {
                    _this.status[s] = monster.getTotalStatus(s);
                    $('#badge-status-current-' + s).text(_this.status[s]);
                });
                this.currentBadgeId = monster.badgeEquip[badgeIndex];
                this.refreshStatusAfter(null);
            };
            BadgeSelector.prototype.refreshStatusAfter = function (badgeId) {
                var _this = this;
                var currentBadge = null;
                if (this.currentBadgeId !== null)
                    currentBadge = this.DB.badges[this.currentBadgeId];
                var newBadge = null;
                if (badgeId !== null)
                    newBadge = this.DB.badges[badgeId];
                this.STATUS_ARRAY.forEach(function (s) {
                    var before = _this.status[s];
                    var after = before;
                    if (currentBadge !== null && currentBadge[s])
                        after -= currentBadge[s];
                    if (newBadge !== null && newBadge[s])
                        after += newBadge[s];
                    $('#badge-status-after-' + s).text(before == after ? '' : after)
                        .toggleClass('badge-status-plus', before < after)
                        .toggleClass('badge-status-minus', before > after);
                });
            };
            BadgeSelector.prototype.toggleSearchButtons = function (anchor, isTurningOn, isUnique) {
                var $button = $(anchor).parent('li');
                var $container = $button.parent('ul');
                if (isUnique)
                    $container.find('li').removeClass('selected');
                $button.toggleClass('selected', isTurningOn);
            };
            BadgeSelector.prototype.filterButtons = function (showIds) {
                var _this = this;
                var $allVisibleButtons = $('#badge-selector-list li:visible');
                var $allHiddenButtons = $('#badge-selector-list li:hidden');
                $allVisibleButtons.filter(function (i, elem) {
                    var badgeId = _this.getBadgeId(elem);
                    return showIds.indexOf(badgeId) == -1;
                }).hide();
                $allHiddenButtons.filter(function (i, elem) {
                    var badgeId = _this.getBadgeId(elem);
                    return showIds.indexOf(badgeId) != -1;
                }).show();
            };
            BadgeSelector.prototype.sortBadgeBy = function (func, desc) {
                var _this = this;
                if (desc === undefined)
                    desc = false;
                $('#badge-selector-list').append($('#badge-selector-list li').toArray().sort(function (a, b) {
                    var key_a = func(a);
                    var key_b = func(b);
                    var ascend = key_a < key_b;
                    if (desc)
                        ascend = !ascend;
                    if (key_a == key_b) {
                        key_a = _this.getBadgeId(a);
                        key_b = _this.getBadgeId(b);
                        ascend = key_a < key_b;
                    }
                    return ascend ? -1 : 1;
                }));
            };
            BadgeSelector.prototype.sortBadgeById = function (desc) {
                var _this = this;
                this.sortBadgeBy(function (li) { return _this.getBadgeId(li); }, desc);
            };
            BadgeSelector.prototype.sortBadgeByKana = function (desc) {
                this.sortBadgeBy(function (li) { return $(li).attr('data-kana-sort-key'); }, desc);
            };
            BadgeSelector.prototype.sortBadgeByFeatureValue = function (feature, desc) {
                var _this = this;
                this.sortBadgeBy(function (li) {
                    var badgeId = _this.getBadgeId(li);
                    var ret = _this.DB.badges[badgeId][feature];
                    return ret !== undefined ? ret : 0;
                }, desc);
            };
            BadgeSelector.prototype.clearFilter = function () {
                $('#badge-selector-list li').show();
                this.badgeSearch.clear();
                $('#badge-search-buttons-race li,' +
                    '#badge-search-buttons-rarity li,' +
                    '#badge-search-buttons-feature li').removeClass('selected');
                this.sortByIdDesc = false;
                $('#badge-sort-badgeid').click();
            };
            BadgeSelector.prototype.apply = function (badgeId) {
                this.closingCallback(badgeId);
                this.hide();
            };
            BadgeSelector.prototype.cancel = function () {
                this.hide();
            };
            BadgeSelector.prototype.show = function (callback) {
                this.clearBadgeInfo();
                this.$maskScreen.show();
                this.$dialog.show();
                this.selectedBadgeId = null;
                this.closingCallback = callback;
            };
            BadgeSelector.prototype.hide = function () {
                this.$dialog.hide();
                this.$maskScreen.hide();
            };
            return BadgeSelector;
        })();
        ;
        //検索機能
        var BadgeSearch = (function () {
            function BadgeSearch() {
                this.univIds = []; //全集合
                this.search = [];
                //検索キャッシュ
                this.searchCache = {};
                this.DB = SkillSimulator.MonsterDB;
            }
            BadgeSearch.prototype.toggleSearch = function (filterType, searchKey) {
                var _this = this;
                var isTurningOn = true;
                this.search.some(function (filter, i) {
                    if (filter.filterType == filterType && filter.searchKey == searchKey) {
                        isTurningOn = false;
                        _this.search.splice(i, 1);
                        return true;
                    }
                    if ((filterType == 'race' || filterType == 'rarity') && filter.filterType == filterType) {
                        _this.search.splice(i, 1);
                        return true;
                    }
                });
                if (isTurningOn)
                    this.search.push({
                        filterType: filterType,
                        searchKey: searchKey
                    });
                return isTurningOn;
            };
            BadgeSearch.prototype.getIds = function () {
                var _this = this;
                return this.search.reduce(function (ids, filter) {
                    var cacheKey = filter.filterType + '_' + filter.searchKey;
                    return _this.arrayIntersect(ids, _this.getSearchCache(cacheKey));
                }, this.getUnivIds());
            };
            BadgeSearch.prototype.arrayIntersect = function (array1, array2) {
                return array1.filter(function (val) { return array2.indexOf(val) >= 0; });
            };
            BadgeSearch.prototype.getSearchCache = function (key) {
                var _this = this;
                if (this.searchCache[key])
                    return this.searchCache[key];
                var _s = key.split('_'), filterType = _s[0], searchKey = _s[1];
                var filterFunc;
                switch (filterType) {
                    case 'race':
                        filterFunc = function (badge) { return badge.race == searchKey; };
                        break;
                    case 'rarity':
                        filterFunc = function (badge) { return badge.rarity == searchKey; };
                        break;
                    case 'feature':
                        filterFunc = function (badge) { return badge[searchKey] !== undefined; };
                        break;
                    default:
                        throw 'UnknownFilterType';
                }
                return this.getUnivIds().filter(function (id) { return filterFunc(_this.DB.badges[id]); });
            };
            BadgeSearch.prototype.getUnivIds = function () {
                if (this.univIds.length > 0)
                    return this.univIds;
                this.univIds = Object.keys(this.DB.badges);
                return this.univIds;
            };
            BadgeSearch.prototype.clear = function () {
                this.search = [];
            };
            return BadgeSearch;
        })();
        //数値を3桁区切りに整形
        function numToFormedStr(num) {
            if (isNaN(num))
                return 'N/A';
            return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
        }
        (function ($) {
            SkillSimulator.Simulator = new SimulatorModel();
            //データJSONを格納する変数
            var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-monster-data.json');
            var $dbLoad = $.getJSON(DATA_JSON_URI, function (data) {
                SkillSimulator.MonsterDB = data;
            });
            //ロード時
            $(function () {
                $dbLoad.done(function (data) {
                    var query = window.location.search.substring(1);
                    if (SkillSimulator.Simulator.validateQueryString(query)) {
                        SkillSimulator.Simulator.applyQueryString(query);
                    }
                    var ui = new SimulatorUI(SkillSimulator.Simulator);
                    ui.setupAll();
                });
            });
        })(jQuery);
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
//# sourceMappingURL=dq10skill-monster.js.map