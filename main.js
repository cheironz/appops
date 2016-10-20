const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
// Data share
const ipcMain = require('electron').ipcMain
// Module to exec shell command
const exec = require('child_process').exec

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

app.setName('Appops')

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800, 
    height: 600,
    title: 'Appops',
    titleBarStyle: 'hidden-inset'
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function getAppList () {
  return new Promise(function(resolve, reject){
    exec('adb shell pm list packages -3', function(err, stdout, stderr){
      if (err) {
        reject(err);
      }else{
        let arr = stdout.split('\npackage:');
        arr[0] = arr[0].slice(8);
        let apps = [];
        arr.forEach(function(item, index, arr){
          let obj = {};
          obj.packageName = item;
          apps.push(obj);
        });
        resolve(apps);
      }
    });
  })
}

function getAppPermissions (packageName) {
  return new Promise(function(resolve, reject){
    exec('adb shell appops get ' + packageName, function(err, stdout, stderr){
      if(err){
        reject(err);
      }else{
        let arr = stdout.split('\n');
        arr.length -= 1;
        if(arr[0].indexOf('No operations') != -1){
          arr.length = 0;
        }else{
          arr.forEach(function(item, index, arr){
            kv = item.slice(0, item.indexOf(';')).split(': ');
            arr[index] = {
              key: kv[0],
              value: kv[1]
            };
          });
        }
        let permissions = arr;
        resolve(permissions);
      }
    });
  });
}

function setAppPermission (packageName, permission) {
  return new Promise(function(resolve, reject){
    exec('adb shell appops set ' + packageName + ' ' + permission.key + ' ' + permission.value, function(err, stdout, stderr){
      if(err){
        reject(err);
      }else{
        resolve();
      }
    });
  });
}

function setAppPermissions (packageName, permissions) {
  permissions.forEach(function(item, index, arr){
    setAppPermission(packageName, item).then(function(){
      console.log('s');
    }, function(err){
      console.log(err);
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
  createWindow();
})

ipcMain.on('getAppList', function(e){
  getAppList().then(function(apps){
    e.sender.send('getAppList', {
      code: 1,
      data: apps
    });
  }, function(err){
    e.sender.send('getAppList', {
      code: 0,
      err: err
    });
    console.log(err);
  });
})

ipcMain.on('getAppPermissions', function(e, arg){
  getAppPermissions(arg).then(function(permissions){
    e.sender.send('getAppPermissions', {
      code: 1,
      packageName: arg,
      permissions: permissions
    });
  }, function(err){
    e.sender.send('getAppPermissions', {
      code: 0,
      err: err
    });
    console.log(err);
  });
})

ipcMain.on('setAppPermissions', function(e, arg){
  setAppPermissions(arg.packageName, arg.permissions);
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.