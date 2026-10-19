import type { Response } from 'express';
export declare class AppController {
    analyze(files: any, body: any): Promise<any>;
    pdf(body: any, res: Response): void;
}
