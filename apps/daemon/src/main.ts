/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from './app/app.module';
import { MainModule } from './main/main.module';

async function bootstrap() {
 /* const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3333;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  */

 
  const mqttDsn = process.env.MQTT_DSN || 'mqtt://192.168.50.204:1883';
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MainModule, {
    transport: Transport.MQTT,
    options: {
      url: mqttDsn,
    },
  });
  
  /*
  const app = await NestFactory.create(MainModule);
  Logger.log(
    `🚀 Application is running and connected`
  );*/
  await app.listen();
}



bootstrap();
