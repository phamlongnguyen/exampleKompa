import 'dotenv/config';
import pm2 from 'pm2';
const MINERS = ["miner001.js", "miner002.js"];

const getProcessSetting = (name) => {
    var alias = name.replace(".js", "");
    return {
        script: __dirname + "/miners/" + name,
        name: name,
        log_date_format: "YYYY-MM-DD HH:mm Z",
        out_file: __dirname + "/miners/" + alias + ".stdout.log",
        error_file: __dirname + "/miners/" + alias + ".stderr.log",
        exec_mode: "fork",
        autorestart: false
    };
}

const run = () => {
    console.log('vo roi ne');
    var promiseLst = [];
    MINERS.map((t) => {
        return getProcessSetting(t);
    }).forEach((t) => {
        promiseLst.push(new Promise(function (resolve, reject) {
            pm2.describe(t.name, function (err, processDescription) {
                if (err) {
                    reject(err);
                } else {
                    var des = processDescription[0];
                    var process = des ? des : {
                        name: t.name,
                        pid: "N/A",
                        pm_id: "N/A",
                        monit: {
                            memory: "N/A",
                            cpu: "N/A"
                        },
                        pm2_env: {
                            status: "unregistry"
                        }
                    };
                    resolve(process);
                }
            });
        }));
    });
    Promise.all(promiseLst)
        .then(function (result) {
            console.log('result', result);
        })
        .catch(function (err) {
            console.log(err);
        });
}


const connectPM2 = (action, processName) => {
    let process = getProcessSetting(processName);
    pm2.connect(function (err) {
        if (err) {
            res.status(500).json(err);
            return;
        }
        pm2[action](process, function (err, apps) {
            // pm2.disconnect();   // Disconnects from PM2
            if (err) {
                return;
            }
            console.log('success', apps);
        });
    });
}
export {
    run,
    getProcessSetting
}