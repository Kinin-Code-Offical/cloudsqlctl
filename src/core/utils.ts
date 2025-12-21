import fs from 'fs-extra';

export async function getTail(filePath: string, lines: number = 10): Promise<string[]> {
    if (!await fs.pathExists(filePath)) {
        return [];
    }
    const content = await fs.readFile(filePath, 'utf-8');
    const allLines = content.split('\n');
    return allLines.slice(-lines);
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
