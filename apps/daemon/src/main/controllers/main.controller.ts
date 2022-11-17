import { Controller, Inject, Logger } from '@nestjs/common';
import { Client, ClientProxy, Ctx, EventPattern, MessagePattern, MqttContext, MqttRecordBuilder, Payload, Transport } from '@nestjs/microservices';
import { BehaviorSubject } from 'rxjs';
import {
    Device,
    Group,
    ComfortCloudClient,
    Parameters
  } from 'panasonic-comfort-cloud-client'
import { Cron } from '@nestjs/schedule';
import { getDiff, applyDiff, rdiffResult } from 'recursive-diff';

@Controller('main')
export class MainController {
    static prefix = 'cloud-confort'
    
    consigne = new BehaviorSubject(0);
    groups:Array<Group>= [];
    devices:Array<Device>= [];
    static prefixedTopic(topic: string): string {
        return MainController.prefix + '/' + topic
    }
    private cloudConfortClient:ComfortCloudClient
    private cloudConfortState={
        token: undefined,
        username: 'sylvain.brissy@gmail.com', 
        password: 'c4r01in3'
    }
    constructor(
        //@Client({ transport: Transport.MQTT })
        @Inject('MQTT_SERVICE')
        private client: ClientProxy,
    ) {
        Logger.log(`🚀  controller start with prefix ${MainController.prefix}/#`);

        this.client.connect().then((el) => {
            this.client.send('cloud-confort/online', 'Online').subscribe((el) => {
                console.log('send', el);
            });
            console.log('connect', el);
        });
        this.consigne.subscribe((consigne) => {
            console.log('new consigne', consigne)
            this.client.send(MainController.prefixedTopic('consigne'), consigne).subscribe((e) => {
                console.log('sended Consigne', e)
            });
        })
        this.cloudConfortClient = new ComfortCloudClient();
       
        

    }
    updateOrCreateDevice(device : Device){
        let diff:rdiffResult[]= []
        const foundDeviceIdx = this.devices.findIndex((elm)=>{
            return (elm.guid == device.guid)
        })
        if (foundDeviceIdx>=0){
            diff = getDiff(this.devices[foundDeviceIdx], device);
            this.devices[foundDeviceIdx] = device;
        } else {
            diff = getDiff({}, device);
            this.devices.push(device)
        }
        return diff;
    }
   
    @Cron('0,10,20,30,40,50 * * * * *')
    async handleCron() {
        console.debug('Called when the every 10 s');
        if(!this.cloudConfortState.token) {
            this.cloudConfortState.token = await this.cloudConfortClient.login(this.cloudConfortState.username, this.cloudConfortState.password)
            console.log(this.cloudConfortState.token);
        }
        const groups = await this.cloudConfortClient.getGroups()
        const groupsDiff = getDiff(this.groups,groups)
        this.groups = groups;
       
        //console.log(groups);
        for(const group of this.groups) {
            const topic=MainController.prefixedTopic('groups/'+group.id )
            const data = group
            for (const device of group.devices) {
                const diff = this.updateOrCreateDevice(device);
                if(diff.length!=0){
                    const topicDevice=MainController.prefixedTopic('devices/'+device.name )
                    console.debug('send '+topicDevice)
                    this.client.send(topicDevice,device).subscribe((e) => { })
                }
            }
            if(groupsDiff.length>0) {
                console.debug('send '+topic)
                this.client.send(topic,data).subscribe((e) => { })

            }
           

        }
        
        
    }
        
    
    

    @EventPattern(MainController.prefixedTopic('devices/+/set'))
    async wildcardMessageHandler(@Payload() data: object, @Ctx() context: MqttContext,) {
        const topic=context.getTopic()
        console.log(`Topic: ${context.getTopic()}`);
        //console.log('receive', data);//,context);
        const deviceName=topic.replace(MainController.prefixedTopic('devices/'),'').replace(/\/set$/,'')
        console.log('looking for '+deviceName)
        const device = this.devices.find((elm)=>{
            return (elm.name == deviceName)
        })
        console.log('found',device)
        if (device){
            const parameters:Parameters={};
            for(const param in data){
                if (param in device){
                    parameters[param]=data[param];
                    
                }
            }
            console.log('Parameters',parameters)
            await this.cloudConfortClient.setParameters(device.guid, parameters)
           
        }
       
    }


}
