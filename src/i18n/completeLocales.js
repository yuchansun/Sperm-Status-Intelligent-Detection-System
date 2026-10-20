import terms from './terms.json'
const mac = {
 en: {
  healthCardMacTitle:'macOS guide (build from source)',healthCardMacPrerequisites:'Requires macOS, internet, Git, Rust / Cargo, a PC/SC-compatible smart card reader and its driver.',
  healthCardMacStepOne:'Step 1: Check Rust',healthCardMacStepOneHint:'If cargo is unavailable, install Rust using the command below and reopen Terminal.',
  healthCardMacStepTwo:'Step 2: Download v0.3.0',healthCardMacStepTwoHint:'Use the versioned folder. If it exists, enter it and run git fetch --tags && git checkout v0.3.0. Keep existing files; detached HEAD is expected.',
  healthCardMacStepThree:'Step 3: Build',healthCardMacStepThreeHint:'The first build downloads dependencies. A successful build shows Finished release profile.',
  healthCardMacStepFour:'Step 4: Start service',healthCardMacStepFourHint:'Keep Terminal open. Closing it or pressing Control + C stops the service. Look for listening on http://127.0.0.1:12345.',
  healthCardVerifyVersion:'Open /version to check the version',healthCardVerifySnapshot:'Open / to check reader status',healthCardTroubleshooting:'macOS troubleshooting',
  healthCardTroubleshootingItems:[
   {title:'cargo: command not found:',text:'Install Rust or reopen Terminal after installation. Command: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'},
   {title:'destination path already exists:',text:'Enter the existing folder and checkout v0.3.0 instead of cloning again.'},
   {title:'/version works but the website cannot connect:',text:'Restart the service using the command for the current website Origin. Allow local network access if prompted.'},
   {title:'pcsc_unavailable:',text:'Check the driver and USB connection, then reconnect the reader.'},
   {title:'SharingViolation:',text:'Close other applications using the card or reader.'},
   {title:'Different results in Chrome and Safari:',text:'Check local network permissions in each browser, refresh and check again.'},
  ],
 },
 ko: {},
}
export function completeLocales(locales) {
 for (const language of ['zh','en','ko']) Object.assign(locales[language],terms[language],mac[language])
}
