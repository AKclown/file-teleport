import { SnippetString } from "vscode";

export class TextSnippet implements SnippetString {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
    appendText(string: string): SnippetString {
        throw new Error("Method not implemented.");
    }
    appendTabstop(number?: number): SnippetString {
        throw new Error("Method not implemented.");
    }
    appendPlaceholder(value: string | ((snippet: SnippetString) => any), number?: number): SnippetString {
        throw new Error("Method not implemented.");
    }
    appendChoice(values: string[], number?: number): SnippetString {
        throw new Error("Method not implemented.");
    }
    appendVariable(name: string, defaultValue: string | ((snippet: SnippetString) => any)): SnippetString {
        throw new Error("Method not implemented.");
    }
}