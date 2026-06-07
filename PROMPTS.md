# Key Implementation Prompts

Below are the exact key prompts provided during this development session to shape the application logic and architecture.

## UI & Authentication
- "anon and api key is 100% correct make ui of signup page better"
- "signup and signin not working use supabase auth to do this"
- "make ui better dont change coloe pallete but nothing is clearly visbile now"
- "now that I have pushed it to production what changes should I make in supabase or google cloud"
- "okay then now confirmation links are not being sent even for google logins and make a popup where you write click on confirmation link sent via mail to login and add a line in md files with this dont update just add"

## Group & Chat Architecture
- "now test everything e2e including chats using websockets and storing in indexed DB"
- "remove edit group card in http://localhost:5173/groups/dc0c3312-02ef-4f73-aaa0-c9096f28382d in this url and the person who created group must also be part of group make a seperate page for chat interface and keep updating AI_Context.md and Build.md when features change"
- "I want to strictly store images in IndexedDB and there is no point of settling from member from member is always loggedin user and to member's amount should suggest max what from member owes and there can be partial settlement aswell also compare md files to the current changes and upadte them carefully without changing major things be careful mdfiles are very very important"
- "logic should stay consistent and amount should be consistent with business logic when a user is removed update md files only if required strictly and in group chat sending png files is not working jpeg files are working"

## Email & Notification Logic
- "implement oauth and [client_secret_json] and when a user is added mail should be sent taht he is added to group from the given mail credentials 'email': 'prabhasmudhiveti@gmail.com', 'password': 'ejcj iurw hmio ghia'"
- "you idiot look at md files and there is is clearly mentioned that hwn a users is added to the group mail should go to the particular added user if user is not signedup then send him the magic link this is mentioned in AI_Context.md and Build.md if not add dont make major changes change it slightly these files are very very important..."
- "to send emails from prabhasmudhiveti gmail.com dont use supabase bulit in mail use some smtp libraries and update md files strictly making minimal changes"
- "revert back to original invite flow but the thing is sending invite link wroks only 2 for an hour and sending magic link one in every 60 secs but as you know there should be emails sent when user is added in agroup this mail should be sent via some js smtp library without relying on any supabase edge functions..."
- "I want to revert entire things that you have coded and I have done it remember thisnow only 2 features are not working 1.confirmation mails not being sent and not asking to confirm on link via mail on screen and 2.mails are not being sent when existing users added in the group I will tell you how to handle this use EmailJS to send emails..."
- "did you add updated method for notifying that they are added in group in md files and moreover this feature is not working not with smtpjs but like this import React, { useState } from 'react'; import emailjs from '@emailjs/browser'; ... and add a few lines about this in md files this is important"

## Settlement & Business Logic
- "and only loggedin user can settle others update this"
- "when I do everything in global settlement (who owes and who wowed to whom in overall groups) that is not being reflected in individual groups [Screenshot] the logic here is not correct update md files onluy if required stricty only if required and in global payments aswell from user is always loggedin user"
- "email in groups has to be unique email in group members has to be unique"
