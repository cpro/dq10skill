/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-monster-main.ts" />

namespace Dq10.SkillSimulator {
	
	class SingleValueCommand implements Command {
		monsterId: string;
		protected prevValue: number = undefined;
		newValue: number;
		
		name = 'SingleValueCommand';
		skillLineId: string;
		
		constructor(monsterId: string, newValue: number) {
			this.monsterId = monsterId;
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
				(this.monsterId === undefined || this.monsterId === command.monsterId) &&
				(this.skillLineId === undefined || this.skillLineId === command.skillLineId);
		}
		absorb(newCommand: Command): void {
			this.newValue = newCommand.newValue;
		}
	}
	
}