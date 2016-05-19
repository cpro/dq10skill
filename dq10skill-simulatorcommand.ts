/**
 * @file dq10skill-command.ts のスキルシミュレータ用実装
 */
/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-main.ts" />

namespace Dq10.SkillSimulator {
	class SingleValueCommand implements Command {
		protected prevValue: number = undefined;
		newValue: number;
		
		name = 'SingleValueCommand';
		vocationId: string;
		skillLineId: string;
		
		constructor(newValue: number) {
			this.newValue = newValue;
		}
		execute(): boolean {
			throw 'NotImplemented';
		}
		undo(): void {
			throw 'NotImplemented';
		}
		isAbsorbable(command: Command): boolean {
			return this.name === command.name &&
				(this.vocationId === undefined || this.vocationId === command.vocationId) &&
				(this.skillLineId === undefined || this.skillLineId === command.skillLineId);
		}
		absorb(newCommand: Command): void {
			this.newValue = newCommand.newValue;
		}
	}
		
	class UpdateSkillPt extends SingleValueCommand {
		name = 'UpdateSkillPt';
		
		constructor(vocationId: string, skillLineId: string, newValue: number) {
			super(newValue);
			this.vocationId = vocationId;
			this.skillLineId = skillLineId;
		}
		
		execute(): boolean {
			if(this.prevValue === undefined)
				this.prevValue = Simulator.getSkillPt(this.vocationId, this.skillLineId);
			var ret = Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.newValue);
			return ret;
		}
		undo(): void {
			Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.prevValue);
		}
		event(): Event {
			return {
				name: 'SkillLineChanged',
				args: [this.vocationId, this.skillLineId]
			};
		}
	}
	
	class UpdateLevel extends SingleValueCommand {
		name = 'UpdateLevel';

		constructor(vocationId: string, newValue: number) {
			super(newValue);
			this.vocationId = vocationId;
		}
		
		execute(): boolean {
			if(this.prevValue === undefined)
				this.prevValue = Simulator.getLevel(this.vocationId);
			var ret = Simulator.updateLevel(this.vocationId, this.newValue);
			return ret;
		}
		undo(): void {
			Simulator.updateLevel(this.vocationId, this.prevValue);
		}
		event(): Event {
			return {
				name: 'VocationalInfoChanged',
				args: [this.vocationId]
			};
		}
	}

	class UpdateTrainingSkillPt extends SingleValueCommand {
		name = 'UpdateTrainingSkillPt';
		
		constructor(vocationId: string, newValue: number) {
			super(newValue);
			this.vocationId = vocationId;
		}
		execute(): boolean {
			if(this.prevValue === undefined)
				this.prevValue = Simulator.getTrainingSkillPt(this.vocationId);
			var ret = Simulator.updateTrainingSkillPt(this.vocationId, this.newValue);
			return ret;
		}
		undo(): void {
			Simulator.updateTrainingSkillPt(this.vocationId, this.prevValue);
		}
		event(): Event {
			return {
				name: 'VocationalInfoChanged',
				args: [this.vocationId]
			};
		}
	}
	
	class UpdateMSP extends SingleValueCommand {
		name = 'UpdateMSP';
		
		constructor(skillLineId: string, newValue: number) {
			super(newValue);
			this.skillLineId = skillLineId;
		}
		execute(): boolean {
			if(this.prevValue === undefined)
				this.prevValue = Simulator.getMSP(this.skillLineId);
			var ret = Simulator.updateMSP(this.skillLineId, this.newValue);
			return ret;
		}
		undo(): void {
			Simulator.updateMSP(this.skillLineId, this.prevValue);
		}
		event(): Event {
			return {
				name: 'MSPChanged',
				args: [this.skillLineId]
			};
		}
	}
	
	class UpdateCustomSkill extends SingleValueCommand {
		private prevArray: number[] = [];
		newArray: number[] = [];
		private rank: number;
		
		name = 'UpdateCustomSkill';
		
		constructor(skillLineId: string, newValue: number, rank: number) {
			super(newValue);
			this.skillLineId = skillLineId;
			this.rank = rank;
			
			this.prevArray = [...Simulator.getCustomSkills(this.skillLineId)];
			this.newArray = [...this.prevArray];
			this.newArray[rank] = newValue;
		}
		execute(): boolean {
			var ret = Simulator.setCustomSkills(this.skillLineId, this.newArray, this.rank);
			this.newArray = [...Simulator.getCustomSkills(this.skillLineId)];
			return ret;
		}
		undo(): void {
			Simulator.setCustomSkills(this.skillLineId, this.prevArray, 0);
		}
		absorb(newCommand: UpdateCustomSkill): void {
			this.newArray = [...newCommand.newArray];
		}
		event(): Event {
			return {
				name: 'CustomSkillChanged',
				args: [this.skillLineId]
			}
		}
	}
	
	class PackageCommand implements Command {
		protected prevSerial: string;
		newValue: number;
		
		name = '';
		vocationId: string;
		skillLineId: string;
		
		execute(): boolean {
			if(this.prevSerial === undefined)
				this.prevSerial = Simulator.serialize();
			var succeeded = this._impl();
			if(!succeeded) {
				Simulator.deserialize(this.prevSerial);
				return false;
			}

			return true;
		}
		undo(): void {
			Simulator.deserialize(this.prevSerial);
		}
		isAbsorbable(command: Command): boolean {
			return false;
		}
		absorb(newCommand: Command): void {
			throw 'IllegalOperation';
		}
		protected _impl(): boolean {
			throw 'NotImplemented';
		}
		event(): Event {
			return {
				name: 'WholeChanged',
				args: []
			};
		}
	}
	
	class SetAllLevel extends PackageCommand {
		constructor(newValue: number) {
			super();
			this.newValue = newValue;
		}
		_impl(): boolean {
			return Object.keys(SimulatorDB.vocations).every((vocationId) => {
				return Simulator.updateLevel(vocationId, this.newValue);
			});
		}
	}

	class SetAllTrainingSkillPt extends PackageCommand {
		constructor(newValue: number) {
			super();
			this.newValue = newValue;
		}
		_impl(): boolean {
			return Object.keys(SimulatorDB.vocations).every((vocationId) => {
				return Simulator.updateTrainingSkillPt(vocationId, this.newValue);
			});
		}
	}
	
	class ClearPtsOfSameSkills extends PackageCommand {
		constructor(skillLineId: string) {
			super();
			this.skillLineId = skillLineId;
		}
		_impl(): boolean {
			Simulator.clearPtsOfSameSkills(this.skillLineId);
			return true;
		}
	}
	
	class ClearMSP extends PackageCommand {
		_impl(): boolean {
			Simulator.clearMSP();
			return true;
		}
	}
	
	class ClearAllSkills extends PackageCommand {
		_impl(): boolean {
			Simulator.clearAllSkills();
			return true;
		}
	}
	
	class PresetStatus extends PackageCommand {
		private status: string;
		constructor(status: string) {
			super();
			this.status = status;
		}
		_impl(): boolean {
			var sarray = this.status.split(';');
			return sarray.reduce((succeeded, s) => Simulator.presetStatus(s) || succeeded, false);
		}
	}
	
	class BringUpLevelToRequired extends PackageCommand {
		_impl(): boolean {
			Simulator.bringUpLevelToRequired();
			return true;
		}
	}
	
	export class SimulatorCommandManager extends CommandManager {
		updateSkillPt(vocationId: string, skillLineId: string, newValue: number): boolean {
			return this.invoke(new UpdateSkillPt(vocationId, skillLineId, newValue));
		}
		updateLevel(vocationId: string, newValue: number): boolean {
			return this.invoke(new UpdateLevel(vocationId, newValue));
		}
		setAllLevel(newValue: number): boolean {
			return this.invoke(new SetAllLevel(newValue));
		}
		updateTrainingSkillPt(vocationId: string, newValue: number): boolean {
			return this.invoke(new UpdateTrainingSkillPt(vocationId, newValue));
		}
		setAllTrainingSkillPt(newValue: number): boolean {
			return this.invoke(new SetAllTrainingSkillPt(newValue));
		}
		updateMSP(skillLineId: string, newValue: number): boolean {
			return this.invoke(new UpdateMSP(skillLineId, newValue));
		}
		updateCustomSkill(skillLineId: string, newValue: number, rank: number) {
			return this.invoke(new UpdateCustomSkill(skillLineId, newValue, rank));
		}
		clearPtsOfSameSkills(skillLineId: string): boolean {
			return this.invoke(new ClearPtsOfSameSkills(skillLineId));
		}
		clearMSP(): boolean {
			return this.invoke(new ClearMSP());
		}
		clearAllSkills(): boolean {
			return this.invoke(new ClearAllSkills());
		}
		presetStatus(status): boolean {
			return this.invoke(new PresetStatus(status));
		}
		bringUpLevelToRequired(): boolean {
			return this.invoke(new BringUpLevelToRequired());
		}
	}
}