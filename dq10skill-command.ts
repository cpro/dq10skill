/// <reference path="eventdispatcher.ts" />

namespace Dq10.SkillSimulator {

	export interface Command {
		execute: () => boolean;
		undo: () => void;
		isAbsorbable: (command: Command) => boolean;
		absorb: (command: Command) => void;
		name: string;
		vocationId?: string;
		skillLineId?: string;
		newValue?: number;
		event?: () => Event;
		undoEvent?: () => Event;
	}

	const UNDO_MAX = 20;
	
	export class CommandManager extends EventDispatcher {
		private commandStack: Command[] = [];
		private cursor = 0;
		
		protected invoke(command: Command): boolean {
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
			
			//イベント発行: undoEvent()が定義されていればそちらを優先
			var event: Event = null;
			if(command.undoEvent !== undefined) {
				event = command.undoEvent();
			} else if(command.event !== undefined) {
				event = command.event();
			}
			if(event !== null)
				this.dispatch(event.name, ...event.args);
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

	}
}
