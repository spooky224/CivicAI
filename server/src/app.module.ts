import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();


@Module({ controllers: [AppController] })
export class AppModule {}
