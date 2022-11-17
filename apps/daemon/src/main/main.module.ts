import { Module } from '@nestjs/common';
import { ClientOptions, ClientProxyFactory, Deserializer, Serializer, Transport } from '@nestjs/microservices';
import { MainController } from './controllers/main.controller';
import { ScheduleModule } from '@nestjs/schedule';


class MySerializer implements Serializer {
    serialize(packet) {
        //console.log('serialize',packet.data)
        return packet.data;
    }
}

class MyDeserializer implements Deserializer {
    deserialize(value, options) {
        //console.log('deserialize',value.data)
        return value.data;
    }
}
const option: ClientOptions={
    transport: Transport.MQTT,
    options: {
      url: process.env.MQTT_DSN || 'mqtt://192.168.50.204:1883',
      serializer: new MySerializer(),
      deserializer: new MyDeserializer()
      
    },
  };

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  controllers: [MainController],
  providers: [
    {
      provide: 'MQTT_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create(option),
    },
    
  ],
})
export class MainModule {}
