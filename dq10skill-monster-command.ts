/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-monster-main.ts" />

namespace Dq10.SkillSimulator {
	
	interface MCommand extends Command {
		monsterId: string;
		skillLineId?: string;
		newValue?: number;
	}
	
	abstract class SingleValueCommand implements MCommand {
		monsterId: string;
		protected prevValue: number = undefined;
		newValue: number;
		
		name = 'SingleValueCommand';
		skillLineId: string;
		
		constructor(monsterId: string, newValue: number) {
			this.monsterId = monsterId;
			this.newValue = newValue;
		}
		abstract execute(): boolean;
		abstract undo(): void;
		
		isAbsorbable(command: MCommand): boolean {
			return this.name === command.name &&
				(this.monsterId === undefined || this.monsterId === command.monsterId) &&
				(this.skillLineId === undefined || this.skillLineId === command.skillLineId);
		}
		absorb(newCommand: MCommand): void {
			this.newValue = newCommand.newValue;
		}
	}
	
	//エントリ追加
	class AddMonster implements MCommand {
		monsterId: string;
		private monsterType: string;
		private newMonster: MonsterUnit;
		
		name = "AddMonster";
		
		constructor(monsterType: string) {
			this.monsterType = monsterType;
		}
		
		execute() {
			var newMonster: MonsterUnit = Simulator.addMonster(this.monsterType);
			if(newMonster) {
				this.monsterId = newMonster.id;
				this.newMonster = newMonster;
			}
			return !!newMonster;
		}
		undo() {
			Simulator.deleteMonster(this.monsterId);
		}
		isAbsorbable(command: MCommand) { return false; }
		absorb() {}
		event(): Event {
			return {
				name: 'MonsterAppended',
				args: [this.newMonster]
			};
		}
		undoEvent(): Event {
			return {
				name: 'MonsterRemoved',
				args: [this.newMonster]
			}
		}
	}
	
	//エントリ削除
	class DeleteMonster implements MCommand {
		monsterId: string;
		private deletedIndex: number;
		private deletedMonster: MonsterUnit;
		
		name = "DeleteMonster";
		
		constructor(monsterId: string) {
			this.monsterId = monsterId;
		}
		
		execute() {
			this.deletedIndex = Simulator.indexOf(this.monsterId);
			var deleted: MonsterUnit = Simulator.deleteMonster(this.monsterId);
			if(deleted) {
				this.deletedMonster = deleted;
			}
			return !!deleted;
		}
		undo() {
			Simulator.splice(this.deletedIndex, 0, this.deletedMonster);
		}
		isAbsorbable(command: MCommand) { return false; }
		absorb() {}
		event(): Event {
			return {
				name: 'MonsterRemoved',
				args: [this.deletedMonster]
			};
		}
		undoEvent(): Event {
			return {
				name: 'MonsterAppended',
				args: [this.deletedMonster, this.deletedIndex]
			}
		}
	}

	export class SimulatorCommandManager extends CommandManager {
		addMonster(monsterType: string): boolean {
			return this.invoke(new AddMonster(monsterType));
		}
		deleteMonster(monsterId: string): boolean {
			return this.invoke(new DeleteMonster(monsterId));
		}
	}
}