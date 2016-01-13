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
        var SimulatorModel = (function () {
            function SimulatorModel() {
                //パラメータ格納用
                this.skillPts = {};
                this.levels = {};
                this.trainingSkillPts = {};
                //マスタースキルポイント
                this.msp = {};
                this.vocationIds = [];
                this.VOCATIONS_DATA_ORDER = [
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
            }
            /* メソッド */
            //パラメータ初期化
            SimulatorModel.prototype.initialize = function () {
                var _this = this;
                this.DB = SkillSimulator.SimulatorDB;
                this.vocationIds = Object.keys(this.DB.vocations);
                this.vocationIds.forEach(function (vocationId) {
                    _this.skillPts[vocationId] = {};
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.skillPts[vocationId][skillLineId] = 0;
                    });
                    _this.levels[vocationId] = _this.DB.consts.level.min;
                    _this.trainingSkillPts[vocationId] = _this.DB.consts.trainingSkillPts.min;
                });
            };
            //スキルポイント取得
            SimulatorModel.prototype.getSkillPt = function (vocationId, skillLineId) {
                return this.skillPts[vocationId][skillLineId];
            };
            //スキルポイント更新：不正値の場合falseを返す
            SimulatorModel.prototype.updateSkillPt = function (vocationId, skillLineId, newValue) {
                var oldValue = this.skillPts[vocationId][skillLineId];
                if (newValue < this.DB.consts.skillPts.min || newValue > this.DB.consts.skillPts.max) {
                    return false;
                }
                if (this.totalOfSameSkills(skillLineId) - oldValue + newValue > this.DB.consts.skillPts.max) {
                    return false;
                }
                this.skillPts[vocationId][skillLineId] = newValue;
                return true;
            };
            //レベル値取得
            SimulatorModel.prototype.getLevel = function (vocationId) {
                return this.levels[vocationId];
            };
            //レベル値更新
            SimulatorModel.prototype.updateLevel = function (vocationId, newValue) {
                if (newValue < this.DB.consts.level.min || newValue > this.DB.consts.level.max) {
                    return false;
                }
                this.levels[vocationId] = newValue;
                return true;
            };
            //特訓スキルポイント取得
            SimulatorModel.prototype.getTrainingSkillPt = function (vocationId) {
                return this.trainingSkillPts[vocationId];
            };
            //特訓スキルポイント更新
            SimulatorModel.prototype.updateTrainingSkillPt = function (vocationId, newValue) {
                if (newValue < this.DB.consts.trainingSkillPts.min || newValue > this.DB.consts.trainingSkillPts.max)
                    return false;
                this.trainingSkillPts[vocationId] = newValue;
                return true;
            };
            //マスタースキルポイント取得
            SimulatorModel.prototype.getMSP = function (skillLineId) {
                return this.msp[skillLineId] || 0;
            };
            //マスタースキルポイント更新
            SimulatorModel.prototype.updateMSP = function (skillLineId, newValue) {
                var oldValue = this.msp[skillLineId] || 0;
                if (newValue < this.DB.consts.msp.min || newValue > this.DB.consts.msp.max)
                    return false;
                if (this.totalMSP() - oldValue + newValue > this.DB.consts.msp.max)
                    return false;
                if (this.totalOfSameSkills(skillLineId) - oldValue + newValue > this.DB.consts.skillPts.max)
                    return false;
                this.msp[skillLineId] = newValue;
                return true;
            };
            //使用中のマスタースキルポイント合計
            SimulatorModel.prototype.totalMSP = function () {
                var _this = this;
                return Object.keys(this.msp).reduce(function (prev, skillLineId) {
                    return prev + _this.msp[skillLineId];
                }, 0);
            };
            //職業のスキルポイント合計
            SimulatorModel.prototype.totalSkillPts = function (vocationId) {
                var vSkillPts = this.skillPts[vocationId];
                return Object.keys(vSkillPts).reduce(function (prev, skillLineId) {
                    return prev + vSkillPts[skillLineId];
                }, 0);
            };
            //同スキルのポイント合計
            SimulatorModel.prototype.totalOfSameSkills = function (skillLineId) {
                var _this = this;
                var total = this.vocationIds.reduce(function (prev, vocationId) {
                    var cur = _this.skillPts[vocationId][skillLineId] || 0;
                    return prev + cur;
                }, 0);
                total += this.msp[skillLineId] || 0;
                return total;
            };
            //特定スキルすべてを振り直し（0にセット）
            SimulatorModel.prototype.clearPtsOfSameSkills = function (skillLineId) {
                var _this = this;
                this.vocationIds.forEach(function (vocationId) {
                    if (_this.skillPts[vocationId][skillLineId])
                        _this.updateSkillPt(vocationId, skillLineId, 0);
                });
                this.msp[skillLineId] = 0;
            };
            //MSPを初期化
            SimulatorModel.prototype.clearMSP = function () {
                this.msp = {};
            };
            //すべてのスキルを振り直し（0にセット）
            SimulatorModel.prototype.clearAllSkills = function () {
                var _this = this;
                this.vocationIds.forEach(function (vocationId) {
                    var vSkillPts = _this.skillPts[vocationId];
                    Object.keys(vSkillPts).forEach(function (skillLineId) {
                        vSkillPts[skillLineId] = 0;
                    });
                });
                this.clearMSP();
            };
            //職業レベルに対するスキルポイント最大値
            SimulatorModel.prototype.maxSkillPts = function (vocationId) {
                return this.DB.skillPtsGiven[this.levels[vocationId]];
            };
            //スキルポイント合計に対する必要レベル取得
            SimulatorModel.prototype.requiredLevel = function (vocationId) {
                var trainingSkillPt = this.getTrainingSkillPt(vocationId);
                var total = this.totalSkillPts(vocationId) - trainingSkillPt;
                for (var l = this.DB.consts.level.min; l <= this.DB.consts.level.max; l++) {
                    if (this.DB.skillPtsGiven[l] >= total) {
                        //特訓スキルポイントが1以上の場合、最低レベル50必要
                        if (trainingSkillPt > this.DB.consts.trainingSkillPts.min && l < this.DB.consts.level.forTrainingMode)
                            return this.DB.consts.level.forTrainingMode;
                        else
                            return l;
                    }
                }
                return NaN;
            };
            //全職業の使用可能スキルポイント
            SimulatorModel.prototype.wholeSkillPtsAvailable = function () {
                var _this = this;
                return Object.keys(this.DB.vocations).reduce(function (prev, vocationId) {
                    var cur = _this.maxSkillPts(vocationId) + _this.getTrainingSkillPt(vocationId);
                    return prev + cur;
                }, 0);
            };
            //全職業の使用済スキルポイント
            SimulatorModel.prototype.wholeSkillPtsUsed = function () {
                var _this = this;
                return Object.keys(this.DB.vocations).reduce(function (prev, vocationId) {
                    var cur = _this.totalSkillPts(vocationId);
                    return prev + cur;
                }, 0);
            };
            //職業・レベルによる必要経験値
            SimulatorModel.prototype.requiredExp = function (vocationId, level) {
                return this.DB.expRequired[this.DB.vocations[vocationId].expTable][level];
            };
            //不足経験値
            SimulatorModel.prototype.requiredExpRemain = function (vocationId) {
                var required = this.requiredLevel(vocationId);
                if (required <= this.levels[vocationId])
                    return 0;
                var remain = this.requiredExp(vocationId, required) - this.requiredExp(vocationId, this.levels[vocationId]);
                return remain;
            };
            //全職業の必要経験値合計
            SimulatorModel.prototype.totalRequiredExp = function () {
                var _this = this;
                return this.vocationIds.reduce(function (prev, vocationId) {
                    var cur = _this.requiredExp(vocationId, _this.levels[vocationId]);
                    return prev + cur;
                }, 0);
            };
            //全職業の不足経験値合計
            SimulatorModel.prototype.totalExpRemain = function () {
                var _this = this;
                return this.vocationIds.reduce(function (prev, vocationId) {
                    var cur = _this.requiredExpRemain(vocationId);
                    return prev + cur;
                }, 0);
            };
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
            SimulatorModel.prototype.totalStatus = function (status) {
                var _this = this;
                //スキルラインデータの各スキルから上記プロパティを調べ合計する
                var skillLineIds = Object.keys(this.DB.skillLines);
                return skillLineIds.reduce(function (wholeTotal, skillLineId) {
                    var totalPts = _this.totalOfSameSkills(skillLineId);
                    var cur = _this.DB.skillLines[skillLineId].skills.filter(function (skill) {
                        return skill.pt <= totalPts && skill[status];
                    }).reduce(function (skillLineTotal, skill) {
                        return skillLineTotal + skill[status];
                    }, 0);
                    return wholeTotal + cur;
                }, 0);
            };
            //特定のパッシブスキルをすべて取得済みの状態にする
            //ステータスが変動した場合trueを返す
            SimulatorModel.prototype.presetStatus = function (status) {
                var _this = this;
                var returnValue = false;
                this.vocationIds.forEach(function (vocationId) {
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        if (!_this.DB.skillLines[skillLineId].unique)
                            return;
                        var currentPt = _this.getSkillPt(vocationId, skillLineId);
                        var skills = _this.DB.skillLines[skillLineId].skills.filter(function (skill) {
                            return skill.pt > currentPt && skill[status];
                        });
                        if (skills.length > 0) {
                            _this.updateSkillPt(vocationId, skillLineId, skills[skills.length - 1].pt);
                            returnValue = true;
                        }
                    });
                });
                return returnValue;
            };
            //現在のレベルを取得スキルに対する必要レベルにそろえる
            SimulatorModel.prototype.bringUpLevelToRequired = function () {
                var _this = this;
                this.vocationIds.forEach(function (vocationId) {
                    var required = _this.requiredLevel(vocationId);
                    if (_this.getLevel(vocationId) < required)
                        _this.updateLevel(vocationId, required);
                });
            };
            SimulatorModel.prototype.serialize = function () {
                var _this = this;
                var serial = '';
                var toByte = String.fromCharCode;
                //先頭に職業の数を含める
                serial += toByte(this.VOCATIONS_DATA_ORDER.length);
                this.VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                    serial += toByte(_this.getLevel(vocationId));
                    serial += toByte(_this.getTrainingSkillPt(vocationId));
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        serial += toByte(_this.getSkillPt(vocationId, skillLineId));
                    });
                });
                //末尾にMSPのスキルラインIDとポイントをペアで格納
                Object.keys(this.msp).forEach(function (skillLineId) {
                    if (_this.msp[skillLineId] > 0) {
                        serial += toByte(_this.DB.skillLines[skillLineId].id) + toByte(_this.msp[skillLineId]);
                    }
                });
                return serial;
            };
            SimulatorModel.prototype.deserialize = function (serial) {
                var _this = this;
                var cur = 0;
                var getData = function () { return serial.charCodeAt(cur++); };
                //先頭に格納されている職業の数を取得
                var vocationCount = getData();
                for (var i = 0; i < vocationCount; i++) {
                    var vocationId = this.VOCATIONS_DATA_ORDER[i];
                    var vSkillLines = this.DB.vocations[vocationId].skillLines;
                    if (serial.length - cur < 1 + 1 + vSkillLines.length)
                        break;
                    this.updateLevel(vocationId, getData());
                    this.updateTrainingSkillPt(vocationId, getData());
                    for (var s = 0; s < vSkillLines.length; s++) {
                        this.updateSkillPt(vocationId, vSkillLines[s], getData());
                    }
                }
                //末尾にデータがあればMSPとして取得
                var skillLineIds = [];
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) {
                    skillLineIds[_this.DB.skillLines[skillLineId].id] = skillLineId;
                });
                while (serial.length - cur >= 2) {
                    var skillLineId = skillLineIds[getData()];
                    var skillPt = getData();
                    if (skillLineId !== undefined)
                        this.updateMSP(skillLineId, skillPt);
                }
            };
            SimulatorModel.prototype.deserializeBit = function (serial) {
                var _this = this;
                var BITS_LEVEL = 8; //レベルは8ビット確保
                var BITS_SKILL = 7; //スキルは7ビット
                var BITS_TRAINING = 7; //特訓スキルポイント7ビット
                var bitArray = [];
                for (var i = 0; i < serial.length; i++)
                    bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));
                //特訓ポイントを含むかどうか: ビット列の長さで判断
                var isIncludingTrainingPts = bitArray.length >= (BITS_LEVEL +
                    BITS_TRAINING +
                    BITS_SKILL * this.DB.vocations[this.VOCATIONS_DATA_ORDER[0]].skillLines.length) * 10; //1.2VU（特訓モード実装）時点の職業数
                var cur = 0;
                this.VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                    _this.updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));
                    if (isIncludingTrainingPts)
                        _this.updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
                    else
                        _this.updateTrainingSkillPt(vocationId, 0);
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
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
            };
            return SimulatorModel;
        })();
        SkillSimulator.SimulatorModel = SimulatorModel;
        var SimulatorUI = (function () {
            function SimulatorUI(sim) {
                var _this = this;
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.mspMode = false; //MSP編集モードフラグ
                this.setupFunctions = [
                    //イベント登録
                    //イベント登録
                    function () {
                        _this.com.on('VocationalInfoChanged', function (vocationId) {
                            _this.refreshVocationInfo(vocationId);
                            //refreshTotalRequiredExp();
                            //refreshTotalExpRemain();
                            _this.refreshTotalSkillPt();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('SkillLineChanged', function (vocationId, skillLineId) {
                            _this.refreshCurrentSkillPt(vocationId, skillLineId);
                            _this.refreshSkillList(skillLineId);
                            _this.refreshAllVocationInfo();
                            //refreshTotalExpRemain();
                            _this.refreshTotalSkillPt();
                            _this.refreshTotalPassive();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('MSPChanged', function (skillLineId) {
                            _this.refreshSkillList(skillLineId);
                            _this.refreshTotalPassive();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('WholeChanged', function () {
                            _this.refreshAll();
                        });
                    },
                    //レベル選択セレクトボックス項目設定
                    //レベル選択セレクトボックス項目設定
                    function () {
                        _this.$lvConsole = $('#lv_console');
                        var $select = $('#lv-select');
                        for (var i = _this.DB.consts.level.min; i <= _this.DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i + " (" + _this.DB.skillPtsGiven[i] + ")"));
                        }
                        $select.change(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            _this.com.updateLevel(vocationId, $(e.currentTarget).val());
                        });
                    },
                    //レベル欄クリック時にUI表示
                    //レベル欄クリック時にUI表示
                    function () {
                        $('.ent_title h2').click(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var consoleLeft = $(e.currentTarget).find('.lv_h2').position().left - 3;
                            _this.$lvConsole.appendTo($(e.currentTarget)).css({ left: consoleLeft });
                            $('#lv-select').val(_this.sim.getLevel(vocationId));
                            _this.$lvConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //特訓ポイント選択セレクトボックス設定
                    //特訓ポイント選択セレクトボックス設定
                    function () {
                        _this.$trainingPtConsole = $('#training_pt_console');
                        var $select = $('#training_pt_select');
                        for (var i = 0; i <= _this.DB.consts.trainingSkillPts.max; i++) {
                            $select.append($('<option />').val(i).text(i.toString() +
                                ' (' + numToFormedStr(_this.DB.trainingPts[i].stamps) + ')'));
                        }
                        $select.change(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            return _this.com.updateTrainingSkillPt(vocationId, parseInt($(e.currentTarget).val(), 10));
                        });
                    },
                    //特訓表示欄クリック時にUI表示
                    //特訓表示欄クリック時にUI表示
                    function () {
                        $('.ent_title .training_pt').click(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var consoleLeft = $('#training-' + vocationId).position().left - 3;
                            _this.$trainingPtConsole.appendTo($(e.currentTarget)).css({ left: consoleLeft });
                            $('#training_pt_select').val(_this.sim.getTrainingSkillPt(vocationId));
                            _this.$trainingPtConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //スピンボタン設定
                    //スピンボタン設定
                    function () {
                        _this.$ptConsole = $('#pt_console');
                        var $spinner = $('#pt_spinner');
                        $spinner.spinner({
                            min: _this.DB.consts.skillPts.min,
                            max: _this.DB.consts.skillPts.max,
                            spin: function (e, ui) {
                                var vocationId = _this.getCurrentVocation(e.currentTarget);
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var succeeded = _this.mspMode ?
                                    _this.com.updateMSP(skillLineId, ui.value) :
                                    _this.com.updateSkillPt(vocationId, skillLineId, ui.value);
                                if (succeeded) {
                                    e.stopPropagation();
                                }
                                else {
                                    return false;
                                }
                            },
                            change: function (e, ui) {
                                var vocationId = _this.getCurrentVocation(e.currentTarget);
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var newValue = $(e.currentTarget).val();
                                var oldValue = _this.mspMode ?
                                    _this.sim.getMSP(skillLineId) :
                                    _this.sim.getSkillPt(vocationId, skillLineId);
                                if (isNaN(newValue)) {
                                    $(e.currentTarget).val(oldValue);
                                    return false;
                                }
                                newValue = parseInt(newValue, 10);
                                if (newValue == oldValue)
                                    return false;
                                var succeeded = _this.mspMode ?
                                    _this.com.updateMSP(skillLineId, newValue) :
                                    _this.com.updateSkillPt(vocationId, skillLineId, newValue);
                                if (!succeeded) {
                                    $(e.currentTarget).val(oldValue);
                                    return false;
                                }
                            },
                            stop: function (e, ui) {
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                _this.selectSkillLine(skillLineId);
                            }
                        });
                    },
                    //スピンコントロール共通
                    //スピンコントロール共通
                    function () {
                        $('input.ui-spinner-input').click(function (e) {
                            //テキストボックスクリック時数値を選択状態に
                            $(e.currentTarget).select();
                        }).keypress(function (e) {
                            //テキストボックスでEnter押下時更新して選択状態に
                            if (e.which == 13) {
                                $('#url_text').focus();
                                $(e.currentTarget).focus().select();
                            }
                        });
                    },
                    //スキルライン名クリック時にUI表示
                    //スキルライン名クリック時にUI表示
                    function () {
                        $('.skill_table caption').mouseenter(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            //位置決め
                            var $baseSpan = $(e.currentTarget).find('.skill_current');
                            var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
                            $('#pt_reset').css({ 'margin-left': $(e.currentTarget).find('.skill_total').width() + 10 });
                            _this.$ptConsole.appendTo($(e.currentTarget).find('.console_wrapper')).css({ left: consoleLeft });
                            $('#pt_spinner').val(_this.mspMode ? _this.sim.getMSP(skillLineId) : _this.sim.getSkillPt(vocationId, skillLineId));
                            //selectSkillLine(skillLineId);
                            _this.$ptConsole.show();
                            e.stopPropagation();
                        }).mouseleave(function (e) {
                            if ($('#pt_spinner:focus').length === 0)
                                _this.hideConsoles();
                        });
                    },
                    //範囲外クリック時・ESCキー押下時にUI非表示
                    //範囲外クリック時・ESCキー押下時にUI非表示
                    function () {
                        _this.$ptConsole.click(function (e) { return e.stopPropagation(); });
                        _this.$lvConsole.click(function (e) { return e.stopPropagation(); });
                        _this.$trainingPtConsole.click(function (e) { return e.stopPropagation(); });
                        $('body').click(function (e) { return _this.hideConsoles(); }).keydown(function (e) {
                            if (e.which == 27)
                                _this.hideConsoles();
                        });
                    },
                    //リセットボタン設定
                    //リセットボタン設定
                    function () {
                        $('#pt_reset').button({
                            icons: { primary: 'ui-icon-refresh' },
                            text: false
                        }).click(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            _this.selectSkillLine(skillLineId);
                            if (_this.mspMode)
                                _this.com.updateMSP(skillLineId, 0);
                            else
                                _this.com.updateSkillPt(vocationId, skillLineId, 0);
                            $('#pt_spinner').val(0);
                        }).dblclick(function (e) {
                            var skillLineId;
                            //ダブルクリック時に各職業の該当スキルをすべて振り直し
                            if (_this.mspMode) {
                                if (!window.confirm('マスタースキルポイントをすべて振りなおします。'))
                                    return;
                                _this.com.clearMSP();
                            }
                            else {
                                skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var skillName = _this.DB.skillLines[skillLineId].name;
                                if (!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
                                    return;
                                _this.com.clearPtsOfSameSkills(skillLineId);
                                $('.' + skillLineId + ' .skill_current').text('0');
                            }
                            $('#pt_spinner').val(0);
                        });
                    },
                    //スキルテーブル項目クリック時
                    //スキルテーブル項目クリック時
                    function () {
                        $('.skill_table tr[class]').click(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);
                            _this.selectSkillLine(skillLineId);
                            var requiredPt = _this.DB.skillLines[skillLineId].skills[skillIndex].pt;
                            var totalPtsOfOthers;
                            if (_this.mspMode) {
                                totalPtsOfOthers = _this.sim.totalOfSameSkills(skillLineId) - _this.sim.getMSP(skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                _this.com.updateMSP(skillLineId, requiredPt - totalPtsOfOthers);
                            }
                            else {
                                totalPtsOfOthers = _this.sim.totalOfSameSkills(skillLineId) - _this.sim.getSkillPt(vocationId, skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                _this.com.updateSkillPt(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
                            }
                        });
                    },
                    //MSPモード切替ラジオボタン
                    //MSPモード切替ラジオボタン
                    function () {
                        $('#msp_selector input').change(function (e) {
                            _this.toggleMspMode($(e.currentTarget).val() == 'msp');
                        });
                    },
                    //URLテキストボックスクリック・フォーカス時
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function (e) {
                            _this.refreshSaveUrl();
                        }).click(function (e) {
                            $(e.currentTarget).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
                            _this.refreshSaveUrl();
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
                        }).click(function (e) {
                            var $entry = $(e.currentTarget).parents('.class_group');
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
                            var vocationId = $(e.currentTarget).attr('id').replace('fold-', '');
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
                        for (var i = _this.DB.consts.level.min; i <= _this.DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i.toString()));
                        }
                        $select.val(_this.DB.consts.level.max);
                        $('#setalllevel>button').button().click(function (e) {
                            _this.com.setAllLevel($select.val());
                        });
                    },
                    //特訓スキルポイント一括設定（最大値固定）
                    //特訓スキルポイント一括設定（最大値固定）
                    function () {
                        $('#setalltrainingsp>button').button({
                            icons: { primary: 'ui-icon-star' }
                        }).click(function (e) {
                            _this.com.setAllTrainingSkillPt(_this.DB.consts.trainingSkillPts.max);
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
                            _this.com.clearAllSkills();
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
                            var a = e.currentTarget;
                            a.href = a.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(_this.sim.serialize()));
                        });
                    },
                    //スキル選択時に同スキルを強調
                    //スキル選択時に同スキルを強調
                    function () {
                        $('.skill_table').click(function (e) {
                            var skillLineId = $(e.currentTarget).attr('class').split(' ')[0];
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
                            _this.com.presetStatus($select.val());
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
                            _this.com.bringUpLevelToRequired();
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
                            _this.hideConsoles();
                            _this.com.undo();
                            _this.refreshAll();
                        });
                        $redoButton.button({
                            icons: { secondary: 'ui-icon-arrowreturnthick-1-e' },
                            disabled: true
                        }).click(function (e) {
                            _this.hideConsoles();
                            _this.com.redo();
                            _this.refreshAll();
                        });
                        _this.com.on('CommandStackChanged', function () {
                            $undoButton.button('option', 'disabled', !_this.com.isUndoable());
                            $redoButton.button('option', 'disabled', !_this.com.isRedoable());
                        });
                        shortcut.add('Ctrl+Z', function () { return $undoButton.click(); });
                        shortcut.add('Ctrl+Y', function () { return $redoButton.click(); });
                    }
                ];
                this.DB = SkillSimulator.SimulatorDB;
                this.sim = sim;
                this.com = new SkillSimulator.SimulatorCommandManager();
            }
            SimulatorUI.prototype.refreshAll = function () {
                var _this = this;
                this.hideConsoles();
                this.refreshAllVocationInfo();
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) { return _this.refreshSkillList(skillLineId); });
                this.refreshTotalSkillPt();
                this.refreshTotalPassive();
                this.refreshControls();
                this.refreshSaveUrl();
                this.refreshUrlBar();
            };
            SimulatorUI.prototype.refreshVocationInfo = function (vocationId) {
                var currentLevel = this.sim.getLevel(vocationId);
                var requiredLevel = this.sim.requiredLevel(vocationId);
                //見出し中のレベル数値
                $("#" + vocationId + " .lv_h2").text(currentLevel);
                var $levelH2 = $("#" + vocationId + " h2");
                //必要経験値
                $("#" + vocationId + " .exp").text(numToFormedStr(this.sim.requiredExp(vocationId, currentLevel)));
                //スキルポイント 残り / 最大値
                var maxSkillPts = this.sim.maxSkillPts(vocationId);
                var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
                var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);
                var $skillPtsText = $("#" + vocationId + " .pts");
                $skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
                $('#training-' + vocationId).text(additionalSkillPts);
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $("#" + vocationId + " .error").toggle(isLevelError);
                if (isLevelError) {
                    $("#" + vocationId + " .req_lv").text(numToFormedStr(requiredLevel));
                    $("#" + vocationId + " .exp_remain").text(numToFormedStr(this.sim.requiredExpRemain(vocationId)));
                }
            };
            SimulatorUI.prototype.refreshAllVocationInfo = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) { return _this.refreshVocationInfo(vocationId); });
            };
            SimulatorUI.prototype.refreshTotalRequiredExp = function () {
                $('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
            };
            SimulatorUI.prototype.refreshTotalExpRemain = function () {
                var totalExpRemain = this.sim.totalExpRemain();
                $('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
                $('#total_exp_remain').text(numToFormedStr(totalExpRemain));
            };
            SimulatorUI.prototype.refreshTotalPassive = function () {
                var _this = this;
                var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
                status.forEach(function (s) { return $('#total_' + s).text(_this.sim.totalStatus(s)); });
                $('#msp_remain').text((this.DB.consts.msp.max - this.sim.totalMSP()).toString() + 'P');
            };
            SimulatorUI.prototype.refreshSkillList = function (skillLineId) {
                var _this = this;
                $("tr[class^=" + skillLineId + "_]").removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
                var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
                this.DB.skillLines[skillLineId].skills.some(function (skill, i) {
                    if (totalOfSkill < skill.pt)
                        return true;
                    $("." + skillLineId + "_" + i).addClass(_this.CLASSNAME_SKILL_ENABLED);
                    return false;
                });
                $("." + skillLineId + " .skill_total").text(totalOfSkill);
                var msp = this.sim.getMSP(skillLineId);
                if (msp > 0)
                    $("<span>(" + msp + ")</span>")
                        .addClass('msp')
                        .appendTo("." + skillLineId + " .skill_total");
            };
            SimulatorUI.prototype.refreshControls = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) {
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.refreshCurrentSkillPt(vocationId, skillLineId);
                    });
                });
            };
            SimulatorUI.prototype.refreshCurrentSkillPt = function (vocationId, skillLineId) {
                $("#" + vocationId + " ." + skillLineId + " .skill_current").text(this.sim.getSkillPt(vocationId, skillLineId));
            };
            SimulatorUI.prototype.refreshTotalSkillPt = function () {
                var $cont = $('#total_sp');
                var available = this.sim.wholeSkillPtsAvailable();
                var remain = available - this.sim.wholeSkillPtsUsed();
                $cont.text(remain + " / " + available);
                var isLevelError = (remain < 0);
                $cont.toggleClass(this.CLASSNAME_ERROR, isLevelError);
            };
            SimulatorUI.prototype.refreshSaveUrl = function () {
                var url = this.makeCurrentUrl();
                $('#url_text').val(url);
                var params = {
                    text: 'DQ10 現在のスキル構成:',
                    hashtags: 'DQ10, dq10_skillsim',
                    url: url,
                    original_referer: window.location.href,
                    tw_p: 'tweetbutton'
                };
                $('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
            };
            SimulatorUI.prototype.refreshUrlBar = function () {
                if (window.history && window.history.replaceState) {
                    var url = this.makeCurrentUrl();
                    history.replaceState(url, null, url);
                }
            };
            SimulatorUI.prototype.makeCurrentUrl = function () {
                return window.location.href.replace(window.location.search, "") + '?' +
                    Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
            };
            SimulatorUI.prototype.selectSkillLine = function (skillLineId) {
                $('.skill_table').removeClass('selected');
                $('.' + skillLineId).addClass('selected');
            };
            SimulatorUI.prototype.toggleMspMode = function (mode) {
                this.mspMode = mode;
                $('body').toggleClass('msp', mode);
            };
            SimulatorUI.prototype.getCurrentVocation = function (currentNode) {
                return $(currentNode).parents('.class_group').attr('id');
            };
            SimulatorUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimulatorUI.prototype.hideConsoles = function () {
                this.$ptConsole.hide();
                this.$lvConsole.hide();
                this.$trainingPtConsole.hide();
            };
            SimulatorUI.prototype.setup = function () {
                this.setupFunctions.forEach(function (func) { return func(); });
                this.refreshAll();
            };
            return SimulatorUI;
        })();
        var SimpleUI = (function () {
            function SimpleUI(sim) {
                var _this = this;
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.setupFunctions = [
                    //URLテキストボックスクリック・フォーカス時
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function (e) {
                            _this.refreshSaveUrl();
                        }).click(function (e) {
                            $(e.currentTarget).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
                            _this.refreshSaveUrl();
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
                    },
                    //ナビゲーションボタン
                    //ナビゲーションボタン
                    function () {
                        $('a#mainui').button({
                            icons: { primary: 'ui-icon-transfer-e-w' }
                        }).click(function (e) {
                            var a = e.currentTarget;
                            a.href = a.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(_this.sim.serialize()));
                        });
                    }
                ];
                this.sim = sim;
                this.DB = SkillSimulator.SimulatorDB;
            }
            SimpleUI.prototype.refreshAll = function () {
                this.refreshAllVocationInfo();
                for (var skillLineId in this.DB.skillLines) {
                    this.refreshSkillList(skillLineId);
                }
                //refreshTotalRequiredExp();
                //refreshTotalExpRemain();
                // refreshTotalPassive();
                this.refreshControls();
                this.refreshSaveUrl();
            };
            SimpleUI.prototype.refreshVocationInfo = function (vocationId) {
                var currentLevel = this.sim.getLevel(vocationId);
                var requiredLevel = this.sim.requiredLevel(vocationId);
                //スキルポイント 残り / 最大値
                var maxSkillPts = this.sim.maxSkillPts(vocationId);
                var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
                var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);
                $("#" + vocationId + " .remain .container").text(remainingSkillPts);
                $("#" + vocationId + " .total .container").text(maxSkillPts + additionalSkillPts);
                $("#" + vocationId + " .level").text("Lv " + currentLevel + " (" + maxSkillPts + ") + \u7279\u8A13 (" + additionalSkillPts + ")");
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $("#" + vocationId + " .remain .container").toggleClass(this.CLASSNAME_ERROR, isLevelError);
            };
            SimpleUI.prototype.refreshAllVocationInfo = function () {
                for (var vocationId in this.DB.vocations) {
                    this.refreshVocationInfo(vocationId);
                }
                $('#msp .remain .container').text(this.DB.consts.msp.max - this.sim.totalMSP());
                $('#msp .total .container').text(this.DB.consts.msp.max);
            };
            SimpleUI.prototype.refreshTotalRequiredExp = function () {
                $('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
            };
            SimpleUI.prototype.refreshTotalExpRemain = function () {
                var totalExpRemain = this.sim.totalExpRemain();
                $('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
                $('#total_exp_remain').text(numToFormedStr(totalExpRemain));
            };
            SimpleUI.prototype.refreshTotalPassive = function () {
                var _this = this;
                var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
                status.forEach(function (s) { return $('#total_' + s).text(_this.sim.totalStatus(s)); });
            };
            SimpleUI.prototype.refreshSkillList = function (skillLineId) {
                var _this = this;
                var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
                $("#footer ." + skillLineId + " .container").text(totalOfSkill);
                var containerName = '#msp .' + skillLineId;
                if (this.DB.skillLines[skillLineId].unique) {
                    Object.keys(this.DB.vocations).some(function (vocationId) {
                        if (_this.DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0) {
                            containerName = '#' + vocationId + ' .msp';
                            return true;
                        }
                        return false;
                    });
                }
                var msp = this.sim.getMSP(skillLineId);
                $(containerName + ' .container').text(msp > 0 ? msp : '');
            };
            SimpleUI.prototype.refreshControls = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) {
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.refreshCurrentSkillPt(vocationId, skillLineId);
                    });
                });
            };
            SimpleUI.prototype.refreshCurrentSkillPt = function (vocationId, skillLineId) {
                var containerName = skillLineId;
                if (this.DB.skillLines[skillLineId].unique) {
                    //踊り子のパッシブ2種に対応
                    if (skillLineId == 'song') {
                        containerName = 'unique2';
                    }
                    else {
                        containerName = 'unique';
                    }
                }
                $("#" + vocationId + " ." + containerName + " .container")
                    .text(this.sim.getSkillPt(vocationId, skillLineId));
            };
            SimpleUI.prototype.refreshSaveUrl = function () {
                var url = this.makeCurrentUrl();
                $('#url_text').val(url);
                var params = {
                    text: 'DQ10 現在のスキル構成:',
                    hashtags: 'DQ10, dq10_skillsim',
                    url: url,
                    original_referer: window.location.href,
                    tw_p: 'tweetbutton'
                };
                $('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
            };
            SimpleUI.prototype.refreshUrlBar = function () {
                if (window.history && window.history.replaceState) {
                    var url = this.makeCurrentUrl();
                    window.history.replaceState(url, null, url);
                }
            };
            SimpleUI.prototype.makeCurrentUrl = function () {
                return window.location.href.replace(window.location.search, "") + '?' +
                    Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
            };
            SimpleUI.prototype.getCurrentVocation = function (currentNode) {
                return $(currentNode).parents('.class_group').attr('id');
            };
            SimpleUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimpleUI.prototype.setup = function () {
                this.setupFunctions.forEach(function (func) { return func(); });
                this.refreshAll();
            };
            return SimpleUI;
        })();
        //ユーティリティ
        //数値を3桁区切りに整形
        function numToFormedStr(num) {
            if (isNaN(num))
                return 'N/A';
            return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
        }
        (function ($) {
            SkillSimulator.Simulator = new SimulatorModel();
            //データJSONを格納する変数
            var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-data.json');
            var $dbLoad = $.getJSON(DATA_JSON_URI, function (data) {
                SkillSimulator.SimulatorDB = data;
            });
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
                            SkillSimulator.Simulator.deserializeBit(serial);
                        }
                        else {
                            SkillSimulator.Simulator.deserialize(serial);
                        }
                    }
                }
                var ui = window.location.pathname.indexOf('/simple.html') > 0 ? new SimpleUI(SkillSimulator.Simulator) : new SimulatorUI(SkillSimulator.Simulator);
                $dbLoad.done(function (data) {
                    SkillSimulator.Simulator.initialize();
                    loadQuery();
                    ui.setup();
                });
            });
        })(jQuery);
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
//# sourceMappingURL=dq10skill.js.map