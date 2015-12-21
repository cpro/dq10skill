/// <reference path="eventdispatcher.ts" />
/// <reference path="dq10skill-main.ts" />

namespace Dq10.SkillSimulator {


	export interface Command {
		execute: () => boolean;
		undo: () => void;
		isAbsorbable: (SimulatorCommand) => boolean;
		absorb: (SimulatorCommand) => void;
		name: string;
		vocationId?: string;
		skillLineId?: string;
		newValue?: number;
		event?: () => Event;
	}
	
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
			//if(ret) CommandManager.dispatch('SkillLineChanged', this.vocationId, this.skillLineId);
			return ret;
		}
		undo(): void {
			Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.prevValue);
			//CommandManager.dispatch('SkillLineChanged', this.vocationId, this.skillLineId);
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
			// if(ret) CommandManager.dispatch('VocationalInfoChanged', this.vocationId);
			return ret;
		}
		undo(): void {
			Simulator.updateLevel(this.vocationId, this.prevValue);
			// CommandManager.dispatch('VocationalInfoChanged', this.vocationId);
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
			// if(ret) CommandManager.dispatch('VocationalInfoChanged', this.vocationId);
			return ret;
		}
		undo(): void {
			Simulator.updateTrainingSkillPt(this.vocationId, this.prevValue);
			// CommandManager.dispatch('VocationalInfoChanged', this.vocationId);
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
			// if(ret) CommandManager.dispatch('MSPChanged', this.skillLineId);
			return ret;
		}
		undo(): void {
			Simulator.updateMSP(this.skillLineId, this.prevValue);
			// CommandManager.dispatch('MSPChanged', this.skillLineId);
		}
		event(): Event {
			return {
				name: 'MSPChanged',
				args: [this.skillLineId]
			};
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

			// CommandManager.dispatch('WholeChanged');
			return true;
		}
		undo(): void {
			Simulator.deserialize(this.prevSerial);
			// CommandManager.dispatch('WholeChanged');
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
			for(var vocationId in SimulatorDB.vocations) {
				var succeeded = Simulator.updateLevel(vocationId, this.newValue);
				if(!succeeded) return false;
			}
			return true;
		}
	}

	class SetAllTrainingSkillPt extends PackageCommand {
		constructor(newValue: number) {
			super();
			this.newValue = newValue;
		}
		_impl(): boolean {
			for(var vocationId in SimulatorDB.vocations) {
				var succeeded = Simulator.updateTrainingSkillPt(vocationId, this.newValue);
				if(!succeeded) return false;
			}
			return true;
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
			var succeeded = false;
			for(var i = 0; i < sarray.length; i++) {
				succeeded = Simulator.presetStatus(sarray[i]) || succeeded;
			}
			return succeeded;
		}
	}
	
	class BringUpLevelToRequired extends PackageCommand {
		_impl(): boolean {
			Simulator.bringUpLevelToRequired();
			return true;
		}
	}
	
	const UNDO_MAX = 20;
	
	export class CommandManager extends EventDispatcher {
		private commandStack: Command[] = [];
		private cursor = 0;
		
		private invoke(command: Command): boolean {
			var succeeded = command.execute();
			if(!succeeded) return false;

			//イベント発行
			if(command.event !== undefined)
				this.dispatch(command.event().name, ...command.event().args);
			
			//以降のスタックを切捨て
			this.commandStack.splice(this.cursor);

			if(this.cursor >= 1 && this.commandStack[this.cursor - 1].isAbsorbable(command)) {
				//連続した同種の操作ならひとつの操作にまとめる
				this.commandStack[this.cursor - 1].absorb(command);
			} else {
				this.commandStack.push(command);
				this.cursor++;
			}

			if(this.commandStack.length > UNDO_MAX) {
				this.commandStack.shift();
				this.cursor--;
			}

			this.dispatch('CommandStackChanged');
			return true;
		}
		
		undo(): void {
			if(!this.isUndoable()) return;

			this.cursor--;
			var command = this.commandStack[this.cursor];
			command.undo();
			if(command.event !== undefined)
				this.dispatch(command.event().name, ...command.event().args);
			this.dispatch('CommandStackChanged');
		}
		
		redo(): void {
			if(!this.isRedoable()) return;

			var command = this.commandStack[this.cursor];
			command.execute();
			if(command.event !== undefined)
				this.dispatch(command.event().name, ...command.event().args);
			this.cursor++;
			this.dispatch('CommandStackChanged');
		}
		
		isUndoable(): boolean {
			return (this.cursor > 0);
		}
		
		isRedoable(): boolean {
			return (this.cursor < this.commandStack.length);
		}
		
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
