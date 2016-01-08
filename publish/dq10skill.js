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
/**
 * @file dq10skill-command.ts のスキルシミュレータ用実装
 */
/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var SingleValueCommand = (function () {
            function SingleValueCommand(newValue) {
                this.prevValue = undefined;
                this.name = 'SingleValueCommand';
                this.newValue = newValue;
            }
            SingleValueCommand.prototype.execute = function () {
                throw 'NotImplemented';
            };
            SingleValueCommand.prototype.undo = function () {
                throw 'NotImplemented';
            };
            SingleValueCommand.prototype.isAbsorbable = function (command) {
                return this.name === command.name &&
                    (this.vocationId === undefined || this.vocationId === command.vocationId) &&
                    (this.skillLineId === undefined || this.skillLineId === command.skillLineId);
            };
            SingleValueCommand.prototype.absorb = function (newCommand) {
                this.newValue = newCommand.newValue;
            };
            return SingleValueCommand;
        })();
        var UpdateSkillPt = (function (_super) {
            __extends(UpdateSkillPt, _super);
            function UpdateSkillPt(vocationId, skillLineId, newValue) {
                _super.call(this, newValue);
                this.name = 'UpdateSkillPt';
                this.vocationId = vocationId;
                this.skillLineId = skillLineId;
            }
            UpdateSkillPt.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getSkillPt(this.vocationId, this.skillLineId);
                var ret = SkillSimulator.Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.newValue);
                return ret;
            };
            UpdateSkillPt.prototype.undo = function () {
                SkillSimulator.Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.prevValue);
            };
            UpdateSkillPt.prototype.event = function () {
                return {
                    name: 'SkillLineChanged',
                    args: [this.vocationId, this.skillLineId]
                };
            };
            return UpdateSkillPt;
        })(SingleValueCommand);
        var UpdateLevel = (function (_super) {
            __extends(UpdateLevel, _super);
            function UpdateLevel(vocationId, newValue) {
                _super.call(this, newValue);
                this.name = 'UpdateLevel';
                this.vocationId = vocationId;
            }
            UpdateLevel.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getLevel(this.vocationId);
                var ret = SkillSimulator.Simulator.updateLevel(this.vocationId, this.newValue);
                return ret;
            };
            UpdateLevel.prototype.undo = function () {
                SkillSimulator.Simulator.updateLevel(this.vocationId, this.prevValue);
            };
            UpdateLevel.prototype.event = function () {
                return {
                    name: 'VocationalInfoChanged',
                    args: [this.vocationId]
                };
            };
            return UpdateLevel;
        })(SingleValueCommand);
        var UpdateTrainingSkillPt = (function (_super) {
            __extends(UpdateTrainingSkillPt, _super);
            function UpdateTrainingSkillPt(vocationId, newValue) {
                _super.call(this, newValue);
                this.name = 'UpdateTrainingSkillPt';
                this.vocationId = vocationId;
            }
            UpdateTrainingSkillPt.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getTrainingSkillPt(this.vocationId);
                var ret = SkillSimulator.Simulator.updateTrainingSkillPt(this.vocationId, this.newValue);
                return ret;
            };
            UpdateTrainingSkillPt.prototype.undo = function () {
                SkillSimulator.Simulator.updateTrainingSkillPt(this.vocationId, this.prevValue);
            };
            UpdateTrainingSkillPt.prototype.event = function () {
                return {
                    name: 'VocationalInfoChanged',
                    args: [this.vocationId]
                };
            };
            return UpdateTrainingSkillPt;
        })(SingleValueCommand);
        var UpdateMSP = (function (_super) {
            __extends(UpdateMSP, _super);
            function UpdateMSP(skillLineId, newValue) {
                _super.call(this, newValue);
                this.name = 'UpdateMSP';
                this.skillLineId = skillLineId;
            }
            UpdateMSP.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getMSP(this.skillLineId);
                var ret = SkillSimulator.Simulator.updateMSP(this.skillLineId, this.newValue);
                return ret;
            };
            UpdateMSP.prototype.undo = function () {
                SkillSimulator.Simulator.updateMSP(this.skillLineId, this.prevValue);
            };
            UpdateMSP.prototype.event = function () {
                return {
                    name: 'MSPChanged',
                    args: [this.skillLineId]
                };
            };
            return UpdateMSP;
        })(SingleValueCommand);
        var PackageCommand = (function () {
            function PackageCommand() {
                this.name = '';
            }
            PackageCommand.prototype.execute = function () {
                if (this.prevSerial === undefined)
                    this.prevSerial = SkillSimulator.Simulator.serialize();
                var succeeded = this._impl();
                if (!succeeded) {
                    SkillSimulator.Simulator.deserialize(this.prevSerial);
                    return false;
                }
                return true;
            };
            PackageCommand.prototype.undo = function () {
                SkillSimulator.Simulator.deserialize(this.prevSerial);
            };
            PackageCommand.prototype.isAbsorbable = function (command) {
                return false;
            };
            PackageCommand.prototype.absorb = function (newCommand) {
                throw 'IllegalOperation';
            };
            PackageCommand.prototype._impl = function () {
                throw 'NotImplemented';
            };
            PackageCommand.prototype.event = function () {
                return {
                    name: 'WholeChanged',
                    args: []
                };
            };
            return PackageCommand;
        })();
        var SetAllLevel = (function (_super) {
            __extends(SetAllLevel, _super);
            function SetAllLevel(newValue) {
                _super.call(this);
                this.newValue = newValue;
            }
            SetAllLevel.prototype._impl = function () {
                var _this = this;
                return Object.keys(SkillSimulator.SimulatorDB.vocations).every(function (vocationId) {
                    return SkillSimulator.Simulator.updateLevel(vocationId, _this.newValue);
                });
            };
            return SetAllLevel;
        })(PackageCommand);
        var SetAllTrainingSkillPt = (function (_super) {
            __extends(SetAllTrainingSkillPt, _super);
            function SetAllTrainingSkillPt(newValue) {
                _super.call(this);
                this.newValue = newValue;
            }
            SetAllTrainingSkillPt.prototype._impl = function () {
                var _this = this;
                return Object.keys(SkillSimulator.SimulatorDB.vocations).every(function (vocationId) {
                    return SkillSimulator.Simulator.updateTrainingSkillPt(vocationId, _this.newValue);
                });
            };
            return SetAllTrainingSkillPt;
        })(PackageCommand);
        var ClearPtsOfSameSkills = (function (_super) {
            __extends(ClearPtsOfSameSkills, _super);
            function ClearPtsOfSameSkills(skillLineId) {
                _super.call(this);
                this.skillLineId = skillLineId;
            }
            ClearPtsOfSameSkills.prototype._impl = function () {
                SkillSimulator.Simulator.clearPtsOfSameSkills(this.skillLineId);
                return true;
            };
            return ClearPtsOfSameSkills;
        })(PackageCommand);
        var ClearMSP = (function (_super) {
            __extends(ClearMSP, _super);
            function ClearMSP() {
                _super.apply(this, arguments);
            }
            ClearMSP.prototype._impl = function () {
                SkillSimulator.Simulator.clearMSP();
                return true;
            };
            return ClearMSP;
        })(PackageCommand);
        var ClearAllSkills = (function (_super) {
            __extends(ClearAllSkills, _super);
            function ClearAllSkills() {
                _super.apply(this, arguments);
            }
            ClearAllSkills.prototype._impl = function () {
                SkillSimulator.Simulator.clearAllSkills();
                return true;
            };
            return ClearAllSkills;
        })(PackageCommand);
        var PresetStatus = (function (_super) {
            __extends(PresetStatus, _super);
            function PresetStatus(status) {
                _super.call(this);
                this.status = status;
            }
            PresetStatus.prototype._impl = function () {
                var sarray = this.status.split(';');
                return sarray.reduce(function (succeeded, s) { return SkillSimulator.Simulator.presetStatus(s) || succeeded; }, false);
            };
            return PresetStatus;
        })(PackageCommand);
        var BringUpLevelToRequired = (function (_super) {
            __extends(BringUpLevelToRequired, _super);
            function BringUpLevelToRequired() {
                _super.apply(this, arguments);
            }
            BringUpLevelToRequired.prototype._impl = function () {
                SkillSimulator.Simulator.bringUpLevelToRequired();
                return true;
            };
            return BringUpLevelToRequired;
        })(PackageCommand);
        var SimulatorCommandManager = (function (_super) {
            __extends(SimulatorCommandManager, _super);
            function SimulatorCommandManager() {
                _super.apply(this, arguments);
            }
            SimulatorCommandManager.prototype.updateSkillPt = function (vocationId, skillLineId, newValue) {
                return this.invoke(new UpdateSkillPt(vocationId, skillLineId, newValue));
            };
            SimulatorCommandManager.prototype.updateLevel = function (vocationId, newValue) {
                return this.invoke(new UpdateLevel(vocationId, newValue));
            };
            SimulatorCommandManager.prototype.setAllLevel = function (newValue) {
                return this.invoke(new SetAllLevel(newValue));
            };
            SimulatorCommandManager.prototype.updateTrainingSkillPt = function (vocationId, newValue) {
                return this.invoke(new UpdateTrainingSkillPt(vocationId, newValue));
            };
            SimulatorCommandManager.prototype.setAllTrainingSkillPt = function (newValue) {
                return this.invoke(new SetAllTrainingSkillPt(newValue));
            };
            SimulatorCommandManager.prototype.updateMSP = function (skillLineId, newValue) {
                return this.invoke(new UpdateMSP(skillLineId, newValue));
            };
            SimulatorCommandManager.prototype.clearPtsOfSameSkills = function (skillLineId) {
                return this.invoke(new ClearPtsOfSameSkills(skillLineId));
            };
            SimulatorCommandManager.prototype.clearMSP = function () {
                return this.invoke(new ClearMSP());
            };
            SimulatorCommandManager.prototype.clearAllSkills = function () {
                return this.invoke(new ClearAllSkills());
            };
            SimulatorCommandManager.prototype.presetStatus = function (status) {
                return this.invoke(new PresetStatus(status));
            };
            SimulatorCommandManager.prototype.bringUpLevelToRequired = function () {
                return this.invoke(new BringUpLevelToRequired());
            };
            return SimulatorCommandManager;
        })(SkillSimulator.CommandManager);
        SkillSimulator.SimulatorCommandManager = SimulatorCommandManager;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/**
 * Base64 URI safe
 * [^\x00-\xFF]な文字しか来ない前提
 */
var Base64 = (function () {
    function Base64() {
    }
    /**
     * btoa
     */
    Base64.btoa = function (b) {
        return window.btoa(b)
            .replace(/[+\/]/g, function (m0) { return m0 == '+' ? '-' : '_'; })
            .replace(/=/g, '');
    };
    /**
     * atob
     */
    Base64.atob = function (a) {
        a = a.replace(/[-_]/g, function (m0) { return m0 == '-' ? '+' : '/'; });
        if (a.length % 4 == 1)
            a += 'A';
        return window.atob(a);
    };
    /**
     * isValid
     */
    Base64.isValid = function (a) {
        return (/^[A-Za-z0-9-_]+$/).test(a);
    };
    return Base64;
})();
/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />
/// <reference path="typings/dq10skill.d.ts" />
/// <reference path="typings/rawdeflate.d.ts" />
/// <reference path="typings/shortcut.d.ts" />
/// <reference path="dq10skill-simulatorcommand.ts" />
/// <reference path="base64.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        (function ($) {
            "use strict";
            //データJSONを格納する変数
            var DB;
            var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-data.json');
            var $dbLoad = $.getJSON(DATA_JSON_URI, function (data) {
                DB = data;
                SkillSimulator.SimulatorDB = DB;
            });
            var Simulator = (function () {
                //パラメータ格納用
                var skillPts = {};
                var levels = {};
                var trainingSkillPts = {};
                //マスタースキルポイント
                var msp = {};
                var vocationIds = [];
                /* メソッド */
                //パラメータ初期化
                function initialize() {
                    vocationIds = Object.keys(DB.vocations);
                    vocationIds.forEach(function (vocationId) {
                        skillPts[vocationId] = {};
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
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
                    if (newValue < DB.consts.skillPts.min || newValue > DB.consts.skillPts.max) {
                        return false;
                    }
                    if (totalOfSameSkills(skillLineId) - oldValue + newValue > DB.consts.skillPts.max) {
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
                    if (newValue < DB.consts.level.min || newValue > DB.consts.level.max) {
                        return false;
                    }
                    levels[vocationId] = newValue;
                    return true;
                }
                //特訓スキルポイント取得
                function getTrainingSkillPt(vocationId) {
                    return trainingSkillPts[vocationId];
                }
                //特訓スキルポイント更新
                function updateTrainingSkillPt(vocationId, newValue) {
                    if (newValue < DB.consts.trainingSkillPts.min || newValue > DB.consts.trainingSkillPts.max)
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
                    if (newValue < DB.consts.msp.min || newValue > DB.consts.msp.max)
                        return false;
                    if (totalMSP() - oldValue + newValue > DB.consts.msp.max)
                        return false;
                    if (totalOfSameSkills(skillLineId) - oldValue + newValue > DB.consts.skillPts.max)
                        return false;
                    msp[skillLineId] = newValue;
                    return true;
                }
                //使用中のマスタースキルポイント合計
                function totalMSP() {
                    return Object.keys(msp).reduce(function (prev, skillLineId) {
                        return prev + msp[skillLineId];
                    }, 0);
                }
                //職業のスキルポイント合計
                function totalSkillPts(vocationId) {
                    var vSkillPts = skillPts[vocationId];
                    return Object.keys(vSkillPts).reduce(function (prev, skillLineId) {
                        return prev + vSkillPts[skillLineId];
                    }, 0);
                }
                //同スキルのポイント合計
                function totalOfSameSkills(skillLineId) {
                    var total = vocationIds.reduce(function (prev, vocationId) {
                        var cur = skillPts[vocationId][skillLineId] || 0;
                        return prev + cur;
                    }, 0);
                    total += msp[skillLineId] || 0;
                    return total;
                }
                //特定スキルすべてを振り直し（0にセット）
                function clearPtsOfSameSkills(skillLineId) {
                    vocationIds.forEach(function (vocationId) {
                        if (skillPts[vocationId][skillLineId])
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
                    vocationIds.forEach(function (vocationId) {
                        var vSkillPts = skillPts[vocationId];
                        Object.keys(vSkillPts).forEach(function (skillLineId) {
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
                    for (var l = DB.consts.level.min; l <= DB.consts.level.max; l++) {
                        if (DB.skillPtsGiven[l] >= total) {
                            //特訓スキルポイントが1以上の場合、最低レベル50必要
                            if (trainingSkillPt > DB.consts.trainingSkillPts.min && l < DB.consts.level.forTrainingMode)
                                return DB.consts.level.forTrainingMode;
                            else
                                return l;
                        }
                    }
                    return NaN;
                }
                //全職業の使用可能スキルポイント
                function wholeSkillPtsAvailable() {
                    return Object.keys(DB.vocations).reduce(function (prev, vocationId) {
                        var cur = maxSkillPts(vocationId) + getTrainingSkillPt(vocationId);
                        return prev + cur;
                    }, 0);
                }
                //全職業の使用済スキルポイント
                function wholeSkillPtsUsed() {
                    return Object.keys(DB.vocations).reduce(function (prev, vocationId) {
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
                    if (required <= levels[vocationId])
                        return 0;
                    var remain = requiredExp(vocationId, required) - requiredExp(vocationId, levels[vocationId]);
                    return remain;
                }
                //全職業の必要経験値合計
                function totalRequiredExp() {
                    return vocationIds.reduce(function (prev, vocationId) {
                        var cur = requiredExp(vocationId, levels[vocationId]);
                        return prev + cur;
                    }, 0);
                }
                //全職業の不足経験値合計
                function totalExpRemain() {
                    return vocationIds.reduce(function (prev, vocationId) {
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
                    return skillLineIds.reduce(function (wholeTotal, skillLineId) {
                        var totalPts = totalOfSameSkills(skillLineId);
                        var cur = DB.skillLines[skillLineId].skills.filter(function (skill) {
                            return skill.pt <= totalPts && skill[status];
                        }).reduce(function (skillLineTotal, skill) {
                            return skillLineTotal + skill[status];
                        }, 0);
                        return wholeTotal + cur;
                    }, 0);
                }
                //特定のパッシブスキルをすべて取得済みの状態にする
                //ステータスが変動した場合trueを返す
                function presetStatus(status) {
                    var returnValue = false;
                    vocationIds.forEach(function (vocationId) {
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            if (!DB.skillLines[skillLineId].unique)
                                return;
                            var currentPt = getSkillPt(vocationId, skillLineId);
                            var skills = DB.skillLines[skillLineId].skills.filter(function (skill) {
                                return skill.pt > currentPt && skill[status];
                            });
                            if (skills.length > 0) {
                                updateSkillPt(vocationId, skillLineId, skills[skills.length - 1].pt);
                                returnValue = true;
                            }
                        });
                    });
                    return returnValue;
                }
                //現在のレベルを取得スキルに対する必要レベルにそろえる
                function bringUpLevelToRequired() {
                    vocationIds.forEach(function (vocationId) {
                        var required = requiredLevel(vocationId);
                        if (getLevel(vocationId) < required)
                            updateLevel(vocationId, required);
                    });
                }
                var VOCATIONS_DATA_ORDER = [
                    'warrior',
                    'priest',
                    'mage',
                    'martialartist',
                    'thief',
                    'minstrel',
                    'ranger',
                    'paladin',
                    'armamentalist',
                    'luminary',
                    'gladiator',
                    'sage',
                    'monstermaster',
                    'itemmaster',
                    'dancer' //踊り子
                ];
                function serialize() {
                    var serial = '';
                    var toByte = String.fromCharCode;
                    //先頭に職業の数を含める
                    serial += toByte(VOCATIONS_DATA_ORDER.length);
                    VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                        serial += toByte(getLevel(vocationId));
                        serial += toByte(getTrainingSkillPt(vocationId));
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            serial += toByte(getSkillPt(vocationId, skillLineId));
                        });
                    });
                    //末尾にMSPのスキルラインIDとポイントをペアで格納
                    Object.keys(msp).forEach(function (skillLineId) {
                        if (msp[skillLineId] > 0) {
                            serial += toByte(DB.skillLines[skillLineId].id) + toByte(msp[skillLineId]);
                        }
                    });
                    return serial;
                }
                function deserialize(serial) {
                    var cur = 0;
                    var getData = function () { return serial.charCodeAt(cur++); };
                    //先頭に格納されている職業の数を取得
                    var vocationCount = getData();
                    for (var i = 0; i < vocationCount; i++) {
                        var vocationId = VOCATIONS_DATA_ORDER[i];
                        var vSkillLines = DB.vocations[vocationId].skillLines;
                        if (serial.length - cur < 1 + 1 + vSkillLines.length)
                            break;
                        updateLevel(vocationId, getData());
                        updateTrainingSkillPt(vocationId, getData());
                        for (var s = 0; s < vSkillLines.length; s++) {
                            updateSkillPt(vocationId, vSkillLines[s], getData());
                        }
                    }
                    //末尾にデータがあればMSPとして取得
                    var skillLineIds = [];
                    Object.keys(DB.skillLines).forEach(function (skillLineId) {
                        skillLineIds[DB.skillLines[skillLineId].id] = skillLineId;
                    });
                    while (serial.length - cur >= 2) {
                        var skillLineId = skillLineIds[getData()];
                        var skillPt = getData();
                        if (skillLineId !== undefined)
                            updateMSP(skillLineId, skillPt);
                    }
                }
                function deserializeBit(serial) {
                    var BITS_LEVEL = 8; //レベルは8ビット確保
                    var BITS_SKILL = 7; //スキルは7ビット
                    var BITS_TRAINING = 7; //特訓スキルポイント7ビット
                    var bitArray = [];
                    for (var i = 0; i < serial.length; i++)
                        bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));
                    //特訓ポイントを含むかどうか: ビット列の長さで判断
                    var isIncludingTrainingPts = bitArray.length >= (BITS_LEVEL +
                        BITS_TRAINING +
                        BITS_SKILL * DB.vocations[VOCATIONS_DATA_ORDER[0]].skillLines.length) * 10; //1.2VU（特訓モード実装）時点の職業数
                    var cur = 0;
                    VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                        updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));
                        if (isIncludingTrainingPts)
                            updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
                        else
                            updateTrainingSkillPt(vocationId, 0);
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
                        });
                    });
                    function bitArrayToNum(bitArray) {
                        return bitArray.reduce(function (prev, bit) { return prev << 1 | bit; }, 0);
                    }
                    function numToBitArray(num, digits) {
                        var bitArray = [];
                        for (var i = digits - 1; i >= 0; i--) {
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
                    getTrainingSkillPt: getTrainingSkillPt,
                    updateTrainingSkillPt: updateTrainingSkillPt,
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
            var SimulatorUI = (function () {
                var CLASSNAME_SKILL_ENABLED = 'enabled';
                var CLASSNAME_ERROR = 'error';
                var sim = Simulator;
                var com = new SkillSimulator.SimulatorCommandManager();
                var $ptConsole, $lvConsole, $trainingPtConsole;
                var mspMode = false; //MSP編集モードフラグ
                function refreshAll() {
                    hideConsoles();
                    refreshAllVocationInfo();
                    Object.keys(DB.skillLines).forEach(function (skillLineId) { return refreshSkillList(skillLineId); });
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
                    $("#" + vocationId + " .lv_h2").text(currentLevel);
                    var $levelH2 = $("#" + vocationId + " h2");
                    //必要経験値
                    $("#" + vocationId + " .exp").text(numToFormedStr(sim.requiredExp(vocationId, currentLevel)));
                    //スキルポイント 残り / 最大値
                    var maxSkillPts = sim.maxSkillPts(vocationId);
                    var additionalSkillPts = sim.getTrainingSkillPt(vocationId);
                    var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocationId);
                    var $skillPtsText = $("#" + vocationId + " .pts");
                    $skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
                    $('#training-' + vocationId).text(additionalSkillPts);
                    //Lv不足の処理
                    var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                    $levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
                    $skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
                    $("#" + vocationId + " .error").toggle(isLevelError);
                    if (isLevelError) {
                        $("#" + vocationId + " .req_lv").text(numToFormedStr(requiredLevel));
                        $("#" + vocationId + " .exp_remain").text(numToFormedStr(sim.requiredExpRemain(vocationId)));
                    }
                }
                function refreshAllVocationInfo() {
                    Object.keys(DB.vocations).forEach(function (vocationId) { return refreshVocationInfo(vocationId); });
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
                    status.forEach(function (s) { return $('#total_' + s).text(sim.totalStatus(s)); });
                    $('#msp_remain').text((DB.consts.msp.max - sim.totalMSP()).toString() + 'P');
                }
                function refreshSkillList(skillLineId) {
                    $("tr[class^=" + skillLineId + "_]").removeClass(CLASSNAME_SKILL_ENABLED); //クリア
                    var totalOfSkill = sim.totalOfSameSkills(skillLineId);
                    DB.skillLines[skillLineId].skills.some(function (skill, i) {
                        if (totalOfSkill < skill.pt)
                            return true;
                        $("." + skillLineId + "_" + i).addClass(CLASSNAME_SKILL_ENABLED);
                        return false;
                    });
                    $("." + skillLineId + " .skill_total").text(totalOfSkill);
                    var msp = sim.getMSP(skillLineId);
                    if (msp > 0)
                        $("<span>(" + msp + ")</span>")
                            .addClass('msp')
                            .appendTo("." + skillLineId + " .skill_total");
                }
                function refreshControls() {
                    Object.keys(DB.vocations).forEach(function (vocationId) {
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            refreshCurrentSkillPt(vocationId, skillLineId);
                        });
                    });
                }
                function refreshCurrentSkillPt(vocationId, skillLineId) {
                    $("#" + vocationId + " ." + skillLineId + " .skill_current").text(sim.getSkillPt(vocationId, skillLineId));
                }
                function refreshTotalSkillPt() {
                    var $cont = $('#total_sp');
                    var available = sim.wholeSkillPtsAvailable();
                    var remain = available - sim.wholeSkillPtsUsed();
                    $cont.text(remain + " / " + available);
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
                    if (window.history && window.history.replaceState) {
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
                    setupFunctions.forEach(function (func) { return func(); });
                    refreshAll();
                }
                var setupFunctions = [
                    //イベント登録
                    //イベント登録
                    function () {
                        com.on('VocationalInfoChanged', function (vocationId) {
                            refreshVocationInfo(vocationId);
                            //refreshTotalRequiredExp();
                            //refreshTotalExpRemain();
                            refreshTotalSkillPt();
                            refreshUrlBar();
                        });
                        com.on('SkillLineChanged', function (vocationId, skillLineId) {
                            refreshCurrentSkillPt(vocationId, skillLineId);
                            refreshSkillList(skillLineId);
                            refreshAllVocationInfo();
                            //refreshTotalExpRemain();
                            refreshTotalSkillPt();
                            refreshTotalPassive();
                            refreshUrlBar();
                        });
                        com.on('MSPChanged', function (skillLineId) {
                            refreshSkillList(skillLineId);
                            refreshTotalPassive();
                            refreshUrlBar();
                        });
                        com.on('WholeChanged', function () {
                            refreshAll();
                        });
                    },
                    //レベル選択セレクトボックス項目設定
                    //レベル選択セレクトボックス項目設定
                    function () {
                        $lvConsole = $('#lv_console');
                        var $select = $('#lv-select');
                        for (var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i + " (" + DB.skillPtsGiven[i] + ")"));
                        }
                        $select.change(function () {
                            var vocationId = getCurrentVocation(this);
                            com.updateLevel(vocationId, $(this).val());
                        });
                    },
                    //レベル欄クリック時にUI表示
                    //レベル欄クリック時にUI表示
                    function () {
                        $('.ent_title h2').click(function (e) {
                            hideConsoles();
                            var vocationId = getCurrentVocation(this);
                            var consoleLeft = $(this).find('.lv_h2').position().left - 3;
                            $lvConsole.appendTo($(this)).css({ left: consoleLeft });
                            $('#lv-select').val(sim.getLevel(vocationId));
                            $lvConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //特訓ポイント選択セレクトボックス設定
                    //特訓ポイント選択セレクトボックス設定
                    function () {
                        $trainingPtConsole = $('#training_pt_console');
                        var $select = $('#training_pt_select');
                        for (var i = 0; i <= DB.consts.trainingSkillPts.max; i++) {
                            $select.append($('<option />').val(i).text(i.toString() +
                                ' (' + numToFormedStr(DB.trainingPts[i].stamps) + ')'));
                        }
                        $select.change(function () {
                            var vocationId = getCurrentVocation(this);
                            return com.updateTrainingSkillPt(vocationId, parseInt($(this).val(), 10));
                        });
                    },
                    //特訓表示欄クリック時にUI表示
                    //特訓表示欄クリック時にUI表示
                    function () {
                        $('.ent_title .training_pt').click(function (e) {
                            hideConsoles();
                            var vocationId = getCurrentVocation(this);
                            var consoleLeft = $('#training-' + vocationId).position().left - 3;
                            $trainingPtConsole.appendTo($(this)).css({ left: consoleLeft });
                            $('#training_pt_select').val(sim.getTrainingSkillPt(vocationId));
                            $trainingPtConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //スピンボタン設定
                    //スピンボタン設定
                    function () {
                        $ptConsole = $('#pt_console');
                        var $spinner = $('#pt_spinner');
                        $spinner.spinner({
                            min: DB.consts.skillPts.min,
                            max: DB.consts.skillPts.max,
                            spin: function (e, ui) {
                                var vocationId = getCurrentVocation(this);
                                var skillLineId = getCurrentSkillLine(this);
                                var succeeded = mspMode ?
                                    com.updateMSP(skillLineId, ui.value) :
                                    com.updateSkillPt(vocationId, skillLineId, ui.value);
                                if (succeeded) {
                                    e.stopPropagation();
                                }
                                else {
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
                                if (isNaN(newValue)) {
                                    $(this).val(oldValue);
                                    return false;
                                }
                                newValue = parseInt(newValue, 10);
                                if (newValue == oldValue)
                                    return false;
                                var succeeded = mspMode ?
                                    com.updateMSP(skillLineId, newValue) :
                                    com.updateSkillPt(vocationId, skillLineId, newValue);
                                if (!succeeded) {
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
                    //スピンコントロール共通
                    function () {
                        $('input.ui-spinner-input').click(function (e) {
                            //テキストボックスクリック時数値を選択状態に
                            $(this).select();
                        }).keypress(function (e) {
                            //テキストボックスでEnter押下時更新して選択状態に
                            if (e.which == 13) {
                                $('#url_text').focus();
                                $(this).focus().select();
                            }
                        });
                    },
                    //スキルライン名クリック時にUI表示
                    //スキルライン名クリック時にUI表示
                    function () {
                        $('.skill_table caption').mouseenter(function (e) {
                            hideConsoles();
                            var vocationId = getCurrentVocation(this);
                            var skillLineId = getCurrentSkillLine(this);
                            //位置決め
                            var $baseSpan = $(this).find('.skill_current');
                            var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
                            $('#pt_reset').css({ 'margin-left': $(this).find('.skill_total').width() + 10 });
                            $ptConsole.appendTo($(this).find('.console_wrapper')).css({ left: consoleLeft });
                            $('#pt_spinner').val(mspMode ? sim.getMSP(skillLineId) : sim.getSkillPt(vocationId, skillLineId));
                            //selectSkillLine(skillLineId);
                            $ptConsole.show();
                            e.stopPropagation();
                        }).mouseleave(function (e) {
                            if ($('#pt_spinner:focus').length === 0)
                                hideConsoles();
                        });
                    },
                    //範囲外クリック時・ESCキー押下時にUI非表示
                    //範囲外クリック時・ESCキー押下時にUI非表示
                    function () {
                        $ptConsole.click(function (e) { e.stopPropagation(); });
                        $lvConsole.click(function (e) { e.stopPropagation(); });
                        $trainingPtConsole.click(function (e) { e.stopPropagation(); });
                        $('body').click(hideConsoles).keydown(function (e) {
                            if (e.which == 27)
                                hideConsoles();
                        });
                    },
                    //リセットボタン設定
                    //リセットボタン設定
                    function () {
                        $('#pt_reset').button({
                            icons: { primary: 'ui-icon-refresh' },
                            text: false
                        }).click(function (e) {
                            var vocationId = getCurrentVocation(this);
                            var skillLineId = getCurrentSkillLine(this);
                            selectSkillLine(skillLineId);
                            if (mspMode)
                                com.updateMSP(skillLineId, 0);
                            else
                                com.updateSkillPt(vocationId, skillLineId, 0);
                            $('#pt_spinner').val(0);
                        }).dblclick(function (e) {
                            var skillLineId;
                            //ダブルクリック時に各職業の該当スキルをすべて振り直し
                            if (mspMode) {
                                if (!window.confirm('マスタースキルポイントをすべて振りなおします。'))
                                    return;
                                com.clearMSP();
                            }
                            else {
                                skillLineId = getCurrentSkillLine(this);
                                var skillName = DB.skillLines[skillLineId].name;
                                if (!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
                                    return;
                                com.clearPtsOfSameSkills(skillLineId);
                                $('.' + skillLineId + ' .skill_current').text('0');
                            }
                            $('#pt_spinner').val(0);
                        });
                    },
                    //スキルテーブル項目クリック時
                    //スキルテーブル項目クリック時
                    function () {
                        $('.skill_table tr[class]').click(function () {
                            var vocationId = getCurrentVocation(this);
                            var skillLineId = getCurrentSkillLine(this);
                            var skillIndex = parseInt($(this).attr('class').replace(skillLineId + '_', ''), 10);
                            selectSkillLine(skillLineId);
                            var requiredPt = DB.skillLines[skillLineId].skills[skillIndex].pt;
                            var totalPtsOfOthers;
                            if (mspMode) {
                                totalPtsOfOthers = sim.totalOfSameSkills(skillLineId) - sim.getMSP(skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                com.updateMSP(skillLineId, requiredPt - totalPtsOfOthers);
                            }
                            else {
                                totalPtsOfOthers = sim.totalOfSameSkills(skillLineId) - sim.getSkillPt(vocationId, skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                com.updateSkillPt(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
                            }
                        });
                    },
                    //MSPモード切替ラジオボタン
                    //MSPモード切替ラジオボタン
                    function () {
                        $('#msp_selector input').change(function (e) {
                            toggleMspMode($(this).val() == 'msp');
                        });
                    },
                    //URLテキストボックスクリック・フォーカス時
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function () {
                            refreshSaveUrl();
                        }).click(function () {
                            $(this).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
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
                            var windowParam = $.map(windowParams, function (val, key) { return key + '=' + val; }).join(',');
                            window.open(this.href, null, windowParam);
                            return false;
                        });
                    },
                    //おりたたむ・ひろげるボタン設定
                    //おりたたむ・ひろげるボタン設定
                    function () {
                        var HEIGHT_FOLDED = '48px';
                        var HEIGHT_UNFOLDED = $('.class_group:last').height() + 'px';
                        var CLASSNAME_FOLDED = 'folded';
                        $('.toggle_ent').button({
                            icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                            text: false,
                            label: 'おりたたむ'
                        }).click(function () {
                            var $entry = $(this).parents('.class_group');
                            $entry.toggleClass(CLASSNAME_FOLDED);
                            if ($entry.hasClass(CLASSNAME_FOLDED)) {
                                $entry.animate({ height: HEIGHT_FOLDED });
                                $(this).button('option', {
                                    icons: { primary: 'ui-icon-arrowthickstop-1-s' },
                                    label: 'ひろげる'
                                });
                            }
                            else {
                                $entry.animate({ height: HEIGHT_UNFOLDED });
                                $(this).button('option', {
                                    icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                                    label: 'おりたたむ'
                                });
                            }
                        });
                        //すべておりたたむ・すべてひろげる
                        $('#fold-all').click(function (e) {
                            $(".class_group:not([class*=\"" + CLASSNAME_FOLDED + "\"]) .toggle_ent").click();
                            $('body, html').animate({ scrollTop: 0 });
                        });
                        $('#unfold-all').click(function (e) {
                            $('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
                            $('body, html').animate({ scrollTop: 0 });
                        });
                        var bodyTop = $('#body_content').offset().top;
                        //特定職業のみひろげる
                        $('#foldbuttons-vocation a').click(function (e) {
                            var vocationId = $(this).attr('id').replace('fold-', '');
                            $('body, html').animate({ scrollTop: $('#' + vocationId).offset().top - bodyTop });
                            if ($('#' + vocationId).hasClass(CLASSNAME_FOLDED))
                                $("#" + vocationId + " .toggle_ent").click();
                        });
                    },
                    //レベル一括設定
                    //レベル一括設定
                    function () {
                        //セレクトボックス初期化
                        var $select = $('#setalllevel>select');
                        for (var i = DB.consts.level.min; i <= DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i.toString()));
                        }
                        $select.val(DB.consts.level.max);
                        $('#setalllevel>button').button().click(function (e) {
                            com.setAllLevel($select.val());
                        });
                    },
                    //特訓スキルポイント一括設定（最大値固定）
                    //特訓スキルポイント一括設定（最大値固定）
                    function () {
                        $('#setalltrainingsp>button').button({
                            icons: { primary: 'ui-icon-star' }
                        }).click(function (e) {
                            com.setAllTrainingSkillPt(DB.consts.trainingSkillPts.max);
                        });
                    },
                    //全スキルをリセット
                    //全スキルをリセット
                    function () {
                        $('#clearallskills>button').button({
                            icons: { primary: 'ui-icon-refresh' }
                        }).click(function (e) {
                            if (!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
                                return;
                            com.clearAllSkills();
                        });
                    },
                    //ナビゲーションボタン
                    //ナビゲーションボタン
                    function () {
                        $('a#hirobaimport').button({
                            icons: { primary: 'ui-icon-arrowreturnthick-1-s' }
                        });
                        $('a#simpleui').button({
                            icons: { primary: 'ui-icon-transfer-e-w' }
                        }).click(function (e) {
                            this.href = this.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(sim.serialize()));
                        });
                    },
                    //スキル選択時に同スキルを強調
                    //スキル選択時に同スキルを強調
                    function () {
                        $('.skill_table').click(function (e) {
                            var skillLineId = $(this).attr('class').split(' ')[0];
                            $('.skill_table').removeClass('selected');
                            $('.' + skillLineId).addClass('selected');
                        });
                    },
                    //パッシブプリセット
                    //パッシブプリセット
                    function () {
                        //セレクトボックス初期化
                        var SELECT_TABLE = [
                            { val: 'pow', text: 'ちから' },
                            { val: 'def', text: 'みのまもり' },
                            { val: 'dex', text: 'きようさ' },
                            { val: 'spd', text: 'すばやさ' },
                            { val: 'magic', text: 'こうげき魔力' },
                            { val: 'heal', text: 'かいふく魔力' },
                            { val: 'charm', text: 'みりょく' },
                            { val: 'maxhp', text: 'さいだいHP' },
                            { val: 'maxmp', text: 'さいだいMP' },
                            { val: 'maxhp;maxmp', text: 'さいだいHP・MP' }
                        ];
                        var $select = $('#preset>select');
                        for (var i = 0; i < SELECT_TABLE.length; i++) {
                            $select.append($("<option />").val(SELECT_TABLE[i].val).text(SELECT_TABLE[i].text));
                        }
                        $select.val('maxhp;maxmp');
                        $('#preset>button').button().click(function (e) {
                            com.presetStatus($select.val());
                        });
                    },
                    //全職業のレベルを取得スキルに応じて引き上げ
                    //全職業のレベルを取得スキルに応じて引き上げ
                    function () {
                        $('#bringUpLevel>button').button({
                            icons: { primary: 'ui-icon-arrowthickstop-1-n' }
                        }).click(function (e) {
                            if (!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで引き上げます。'))
                                return;
                            com.bringUpLevelToRequired();
                        });
                    },
                    //undo/redo
                    //undo/redo
                    function () {
                        var $undoButton = $('#undo');
                        var $redoButton = $('#redo');
                        $undoButton.button({
                            icons: { primary: 'ui-icon-arrowreturnthick-1-w' },
                            disabled: true
                        }).click(function (e) {
                            hideConsoles();
                            com.undo();
                            refreshAll();
                        });
                        $redoButton.button({
                            icons: { secondary: 'ui-icon-arrowreturnthick-1-e' },
                            disabled: true
                        }).click(function (e) {
                            hideConsoles();
                            com.redo();
                            refreshAll();
                        });
                        com.on('CommandStackChanged', function () {
                            $undoButton.button('option', 'disabled', !com.isUndoable());
                            $redoButton.button('option', 'disabled', !com.isRedoable());
                        });
                        shortcut.add('Ctrl+Z', function () {
                            $undoButton.click();
                        });
                        shortcut.add('Ctrl+Y', function () {
                            $redoButton.click();
                        });
                    }
                ];
                //数値を3桁区切りに整形
                function numToFormedStr(num) {
                    if (isNaN(num))
                        return 'N/A';
                    return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
                }
                //API
                return {
                    setup: setup,
                    refreshAll: refreshAll
                };
            })();
            var SimpleUI = (function () {
                var CLASSNAME_SKILL_ENABLED = 'enabled';
                var CLASSNAME_ERROR = 'error';
                var sim = Simulator;
                var $ptConsole, $lvConsole, $trainingPtConsole;
                function refreshAll() {
                    refreshAllVocationInfo();
                    for (var skillLineId in DB.skillLines) {
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
                    $("#" + vocationId + " .remain .container").text(remainingSkillPts);
                    $("#" + vocationId + " .total .container").text(maxSkillPts + additionalSkillPts);
                    $("#" + vocationId + " .level").text("Lv " + currentLevel + " (" + maxSkillPts + ") + \u7279\u8A13 (" + additionalSkillPts + ")");
                    //Lv不足の処理
                    var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                    $("#" + vocationId + " .remain .container").toggleClass(CLASSNAME_ERROR, isLevelError);
                }
                function refreshAllVocationInfo() {
                    for (var vocationId in DB.vocations) {
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
                    status.forEach(function (s) { return $('#total_' + s).text(sim.totalStatus(s)); });
                }
                function refreshSkillList(skillLineId) {
                    var totalOfSkill = sim.totalOfSameSkills(skillLineId);
                    $("#footer ." + skillLineId + " .container").text(totalOfSkill);
                    var containerName = '#msp .' + skillLineId;
                    if (DB.skillLines[skillLineId].unique) {
                        Object.keys(DB.vocations).some(function (vocationId) {
                            if (DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0) {
                                containerName = '#' + vocationId + ' .msp';
                                return true;
                            }
                            return false;
                        });
                    }
                    var msp = sim.getMSP(skillLineId);
                    $(containerName + ' .container').text(msp > 0 ? msp : '');
                }
                function refreshControls() {
                    Object.keys(DB.vocations).forEach(function (vocationId) {
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            refreshCurrentSkillPt(vocationId, skillLineId);
                        });
                    });
                }
                function refreshCurrentSkillPt(vocationId, skillLineId) {
                    var containerName = skillLineId;
                    if (DB.skillLines[skillLineId].unique) {
                        //踊り子のパッシブ2種に対応
                        if (skillLineId == 'song') {
                            containerName = 'unique2';
                        }
                        else {
                            containerName = 'unique';
                        }
                    }
                    $("#" + vocationId + " ." + containerName + " .container")
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
                    if (window.history && window.history.replaceState) {
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
                    setupFunctions.forEach(function (func) { return func(); });
                    refreshAll();
                }
                var setupFunctions = [
                    //URLテキストボックスクリック・フォーカス時
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function () {
                            refreshSaveUrl();
                        }).click(function () {
                            $(this).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
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
                            var windowParam = $.map(windowParams, function (val, key) { return key + '=' + val; }).join(',');
                            window.open(this.href, null, windowParam);
                            return false;
                        });
                    },
                    //ナビゲーションボタン
                    //ナビゲーションボタン
                    function () {
                        $('a#mainui').button({
                            icons: { primary: 'ui-icon-transfer-e-w' }
                        }).click(function (e) {
                            this.href = this.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(sim.serialize()));
                        });
                    }
                ];
                //数値を3桁区切りに整形
                function numToFormedStr(num) {
                    if (isNaN(num))
                        return 'N/A';
                    return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
                }
                //API
                return {
                    setup: setup,
                    refreshAll: refreshAll
                };
            })();
            //ロード時
            $(function () {
                function loadQuery() {
                    var query = window.location.search.substring(1);
                    if (Base64.isValid(query)) {
                        var serial = '';
                        try {
                            serial = RawDeflate.inflate(Base64.atob(query));
                        }
                        catch (e) {
                        }
                        if (serial.length < 33) {
                            serial = Base64.atob(query);
                            Simulator.deserializeBit(serial);
                        }
                        else {
                            Simulator.deserialize(serial);
                        }
                    }
                }
                var ui = window.location.pathname.indexOf('/simple.html') > 0 ? SimpleUI : SimulatorUI;
                $dbLoad.done(function (data) {
                    Simulator.initialize();
                    loadQuery();
                    ui.setup();
                });
            });
        })(jQuery);
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
