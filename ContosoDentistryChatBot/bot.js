// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require("./intentrecognizer")

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.qnaMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);
       
        // create a DentistScheduler connector
        this.DentistScheduler = new DentistScheduler(configuration.SchedulerConfiguration);
        // create a IntentRecognizer connector
        this.intentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        this.onMessage(async (context, next) => {
            
          
            // send user input to IntentRecognizer and collect the response in a variable
            // don't forget 'await'

            const LuisResult = await this.intentRecognizer.executeLuisQuery(context);   
            if (LuisResult.luisResult.prediction.topIntent === "ScheduleAppointment" &&
                LuisResult.intents.ScheduleAppointment.score > .6 &&                
                LuisResult.entities.$instance.time[0]

            ) {
                const time = LuisResult.entities.$instance.time[0].text;
                const getMeetingTime = await this.DentistScheduler.scheduleAppointment(time);
                // call api with location entity info
                await context.sendActivity(getMeetingTime);
                await next();
                return;
            }

            if (LuisResult.luisResult.prediction.topIntent === "GetAvailability" &&
                LuisResult.intents.GetAvailability.score > .6                 
            ) {
                const checkAvailable = await this.DentistScheduler.getAvailability();
                await context.sendActivity(checkAvailable);
                await next();
                return;               
            }
            
            // if(top intent is intentA and confidence greater than 50){
            //  doSomething();
            //  await context.sendActivity();
            //  await next();
            //  return;
            // }
            // else {...}

            // send user input to QnA Maker and collect the response in a variable
            // don't forget to use the 'await' keyword
            const qnaResults = await this.qnaMaker.getAnswers(context);
            if (qnaResults[0]) {
                console.log(qnaResults[0])
                await context.sendActivity(`${qnaResults[0].answer}`);
             } else {                
                await context.sendActivity(`I'm not sure I found an answer to your question. You can ask me questions about patient like "What is the youngest patient you accept?"`);
             }
             
            await next();
    });

        this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        //write a custom greeting
        const welcomeText = 'Welcome User';

        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }
        }
        // by calling next() you ensure that the next BotHandler is run.
        await next();
    });
    }
}

module.exports.DentaBot = DentaBot;
