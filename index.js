#! /usr/bin/env node
// @ts-check
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import { exec, execSync } from "child_process";
import chalk from 'chalk'
import { platform, userInfo } from 'os'
import fetch from 'node-fetch'
import * as cli from 'cli-progress'
import request from 'request'
import path from 'path'
import jszip from 'jszip'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, createWriteStream, unlinkSync, renameSync } from "fs";
import {writeFile, rm} from 'fs/promises'
import { tmpdir } from "os";
// const args = process.argv.slice(2)
// if(!args[0]) {
//     console.log(chalk.red('Please Specify your folder in arguments...') + '\n' + chalk.yellow("Example: ") + chalk.green("npx create-setsu-bot folder-name"));
//     process.exit(1)
// }
if(existsSync(path.resolve(process.cwd(), 'setsu-bot'))) {
    console.log(chalk.yellowBright('Folder setsu-bot is already exists, please remove or rename first...'));
    process.exit(1)
}
console.clear()
console.log(`
${chalk.hex('#98d647')('Welcome to ') + chalk.hex('#f28430')('Setsu-Bot') + chalk.hex('#98d647')(' ...')}

${chalk.hex('#cb30f2')('Preparing...')}
`);
async function askNumber(message = chalk.bgRed("Please input your number...")) {
    const data = await inquirer.prompt([
        {
            type: "input",
            name: "number",
            message
        }
    ]);
    if(!data.number || !data.number.includes("08") ||!data.number.includes("628") && data.number.length < 10 || data.number.includes("-")) await askNumber(chalk.hex(generateColor())("Please input your number correctly!..."))
    if(data.number.startsWith("+628")) return data.number.replace("+", "")
    else if(data.number.startsWith("08")) return data.number.replace("08", "628")
}
const generateColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`
const sleep = (/** @type {number} */ ms) => new Promise(r => setTimeout(r, ms))
//@ts-check
function download(url, filename, message) {
    return new Promise((resolve, reject) => {
        const progressBar = new cli.SingleBar({
            format: `${message ? message : ""} ${chalk.hex(generateColor())('{bar}')} ${chalk.green('{percentage}%')} | ETA: ${chalk.yellow('{eta}s')}`
        }, cli.Presets.shades_classic);
        const file = createWriteStream(filename);
        let receivedBytes = 0
        request.get(url)
        .on('response', (response) => {
            if (response.statusCode !== 200) {
                return reject('Response status was ' + response.statusCode);
            }
            const totalBytes = response.headers['content-length'];
            // @ts-ignore
            progressBar.start(parseInt(totalBytes), 0);
        })
        .on('data', (chunk) => {
            receivedBytes += chunk.length;
            progressBar.update(receivedBytes);
        })
        .pipe(file)
        .on('error', (err) => {
            unlinkSync(filename);
            progressBar.stop();
            return reject(err.message);
        });
    
        file.on('finish', () => {
            progressBar.stop();
            file.close(resolve);
        });
    
        file.on('error', (err) => {
            unlinkSync(filename); 
            progressBar.stop();
            return reject(err.message);
        });
        
    })
}

/**
 * @param {import("fs").PathOrFileDescriptor} file
 */
function extractFiles(file, folder = './') {
    return new Promise(async (resolve, reject) => {
        const spinner = createSpinner(chalk.cyan("Extracting files...")).start()
        const zip = new jszip()
        const data = readFileSync(file)
        const files = await zip.loadAsync(data)
        existsSync(folder) ? undefined : mkdirSync(folder)
        const keys = Object.keys(files.files)
        for (let key of keys) {
            const item = files.files[key]
            if(item.dir) {
                const directory = path.resolve(folder, item.name)
                if(existsSync(directory)) {
                    await rm(directory, {recursive: true})
                    mkdirSync(directory)
                } else mkdirSync(directory)
            }
            else writeFileSync(path.resolve(folder, item.name), Buffer.from(await item.async('arraybuffer')))
        }
        spinner.success()
        resolve(undefined)
    })
}
const vars = new Map([
    ["password", undefined]
])
// chalkAnimation.
/**
 * @param {string} message
 */
async function askPassword(message) {
    const data = await inquirer.prompt([
        {
            type: 'password',
            name: "password",
            message,
            mask: '*'
        }
    ]);
    vars.set("password", data.password)
}
async function getFFmpegLinks(){
    const data = await fetch("https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest")
    const response = await data.text()
    const parsed = JSON.parse(response)
    const filtered = parsed.assets.filter(item => {
        return item.name.includes("n4.4") && item.name.includes("win64") && item.name.includes("gpl") && item.name.includes("shared")
    });
    // console.log(filtered[0].browser_download_url);c
    // console.log(parsed.assets);
    return filtered[0].browser_download_url
}

async function downloadScript() {
return new Promise(async (resolve) => {
    const data = await fetch('https://api.github.com/repos/Kenzuya/Setsu-MD/releases/latest')
    const response = await data.text()
    const parsed = JSON.parse(response)
    const filtered = parsed.assets.filter(item => {
     return item.name.includes('setsu-md')
    })
 //    console.log(filtered);
    const directory = path.resolve(tmpdir(), 'setsu-bot.zip')
    await download(filtered[0].browser_download_url, directory, chalk.blueBright('Downloading Setsu-Bot...'))
    await extractFiles(directory, path.resolve(process.cwd(), 'setsu-bot'))
    const spinner = createSpinner(chalk.hex(generateColor())('Installing dependencies...')).start()
    exec('cd setsu-bot && npm install', (err) => {
        if(err) {
            console.log(chalk.hex(generateColor())('Unknown error to installing dependencies...'));
            console.log(chalk.hex(generateColor())('Script is already downloaded, but we failed to install...'));
            console.log(chalk.hex(generateColor())('You can check setsu-bot directory, exiting...'));
            spinner.error()
            process.exit(1)
        } else {
            spinner.success()
            resolve(undefined)
            unlinkSync(directory)
            // unlinkSync(path.resolve(process.cwd(), 'setsu-bot'))
        }
    })
})
}
/**
 * @param {string} src
 * @param {string} dest
 */
function copyFolder(src, dest) {
    return new Promise((resolve, reject) => {
        exec(`powershell -Command "Start-Process cmd -Verb RunAs '/c cd c:\\ && xcopy ${src} ${dest} /s /e /h'"`, async (err, stdout, stderr) => {
            if (err?.code === 1) {
                console.log(chalk.red('Copy failed...'), chalk.yellow('\nPlease allow me to copy files as administrator...'));
                await copyFolder(src, dest)
                resolve(undefined)
            } else if (err) {
                console.log(chalk.red('Copy failed... \n'))
                resolve(undefined)
            } 
            else resolve(undefined)
        })
    })
}
// function renameFolder()
async function checkDependencies() {
    return new Promise(async (resolve) => {
        async function checkGitBash() {
            const spinner = createSpinner(chalk.yellow('Checking Git...')).start()
            await sleep(2000)
            return new Promise((resolve, reject) => {
                exec('git --version', async (err) => {
                    if(err) {
                        spinner.update({text: chalk.yellow('Git is not installed, installing...')})
                        const os = platform()
                        if(os === 'android') {
                            exec('pkg install git -y', (err) => {
                                if(err) {
                                    spinner.error({text: chalk.red('Failed to install Git, exiting...')})
                                    process.exit(1)
                                } else {
                                    spinner.success({text: chalk.green('Git succesfully installed...')})
                                    resolve(undefined)
                                }
                            })
                        } else if(os === 'linux') {
                            await askPassword("Please input your user password to install FFmpeg...\nJust enter if not using Password\n")
                            exec(`echo ${vars.get('password')} | sudo -S apt install git -y`, (err) => {
                                if(err) {
                                    spinner.error({text: chalk.red('Failed to install Git, exiting...')})
                                    process.exit(1)
                                } else {
                                    spinner.success({text: chalk.green('Git succesfully installed...')})
                                    resolve(undefined)
                                }
                            })
                        } else if (os === 'win32') {
                            spinner.error({text: chalk.red('Please install git first from https://gitforwindows.org/, exiting...')})
                            process.exit(1)
                        } else {
                            spinner.error({text: chalk.red('Please install git manually, exiting...')})
                            process.exit(1)
                        }
                    } else {
                        spinner.success({text: chalk.green('Git is instaled...')})
                        resolve(undefined)
                    }
                })
            })
        }
        function checkFFmpeg() {
            // const text = chalkAnimation.neon("Checking ffmpeg")
            return new Promise(async (resolve) => {
                const spinner = createSpinner(chalk.cyan("Checking FFmpeg...")).start();
                await sleep(2000)
                exec("ffmpeg -version", async (err, stdout, stderr) => {
                    if (err) {
                        spinner.error({ text: chalk.red("FFmpeg is not installed...") });
                        const os = platform()
                        async function execResult(err, stdout, stderr) {
                            if (err) {
                                if (os == 'linux') {
                                    if(err.code === 1) {
                                        spinner.error({ text: chalk.red('Failed to install, maybe wrong password?') })
                                        await askPassword("Wrong password...\nPlease input your password correctly")
                                        spinner.start({ text: chalk.yellowBright('Installing FFmpeg...\n') })
                                        exec(`echo ${vars.get('password')} | sudo -S apt install ffmpeg -y`, execResult)
                                    } else spinner.error({ text: chalk.red('Failed to install, find your own way to install FFmpeg...') })
                                }
                                resolve(undefined)
                            }
                            else if (stdout) {
                                spinner.success({ text: chalk.green('Installed succesfully...') })
                                resolve(undefined)
                            }
                            else {
                                spinner.error({ text: chalk.red('Failed to install FFmpegg, find your own way to install') })
                                resolve(undefined)
                            }
                        }
                        if (os === 'android') {
                            spinner.start({ text: chalk.yellowBright('Installing FFmpeg...\n') })
                            exec('pkg install ffmpeg -y', execResult)
                        } else if (os === 'linux') {
                            if (!vars.get('password')) {
                                await askPassword("Please input your user password to install FFmpeg...\nJust enter if not using Password\n")
                                spinner.start({ text: chalk.yellowBright('Installing FFmpeg...\n') })
                                exec(`echo ${vars.get('password')} | sudo -S apt install ffmpeg -y`, execResult)
                            } else {
                                spinner.start({ text: chalk.yellowBright('Installing FFmpeg...\n') })
                                exec(`echo ${vars.get('password')} | sudo -S apt install ffmpeg -y`, execResult)
                            }
                        } else if (os === 'win32') {
                            try {
                                const link = await getFFmpegLinks()
                                const filename = 'ffmpeg.zip'
                                const directory = path.resolve(tmpdir(), filename)
                                await download(link, directory, chalk.yellow('Downloading FFmpeg...'))
                                await extractFiles(directory, tmpdir())
                                const filenames = readdirSync(tmpdir()).filter(val => val.includes("ffmpeg") && val.includes("shared"))[0]
                                const newDirectory = path.resolve(tmpdir(), 'ffmpeg')
                                const destination = path.resolve('C:\\', 'ffmpeg')
                                if(existsSync(newDirectory)) await rm(newDirectory, {recursive: true})
                                renameSync(path.resolve(tmpdir(), filenames), newDirectory)
                                existsSync(path.resolve(destination, 'ffmpeg')) ? await rm(path.resolve(destination, 'ffmpeg'), {recursive: true}) : undefined
                                await copyFolder(newDirectory, destination)
                                
                                unlinkSync(directory)
                                await rm(newDirectory, {recursive: true})
                                const spinner = createSpinner(`\n${chalk.yellow(
`Please follow this instructions to set FFmpeg environment variables`)}
    
${chalk.cyan(`Please click "Path" in ${chalk.greenBright('User variable for ' + userInfo().username)} > ${chalk.hex(generateColor())('Edit')} > ${chalk.hex(generateColor())('New')} > ${chalk.hex(generateColor())('Browse')} > ${chalk.hex(generateColor())('Go to C:\\ffmpeg\\bin')} > OK`)}
${chalk.red('Don\'t forget to close window when you\'re done')}
    `).start()
                                    execSync('rundll32 sysdm.cpl,EditEnvironmentVariables')
                                    spinner.success()
                                    console.log(chalk.greenBright('FFmpeg is completely installed...'));
                                    console.log(chalk.yellowBright('FFmpeg saved in folder C:\\ffmpeg'));
                                resolve(undefined)
                            } catch (err) {
                                console.log('Process exited with error...');
                                console.log('Reasons: ' + err);
                                existsSync('./setsu-bot') ? await rm('./setsu-bot', {recursive: true}) : undefined
                                process.exit(1)
                            }
                        } 
                        else console.log(chalk.cyan('I can\'t install FFmpeg, please find your own way to install FFmpeg...'))
                    }
                    else if (stdout) {
                        spinner.success({ text: chalk.green('FFmpeg is installed...') })
                        resolve(undefined)
                    }
                });
            })
        }
        await checkFFmpeg()
        await checkGitBash()
        // await checkPython()
        resolve(undefined)
    });
}

async function askTimezone() {
    const data = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'timezone',
        message: 'Select Timezone...',
        choices: ['Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura'],
        default() {
          return "Asia/Jakarta"
        },
      },
    ])
    return data.timezone
}
async function createConfigFile(folder = process.cwd()) {
    console.log(chalk.hex('#ff4db8')('Creating Config file...'));
    const number = await askNumber()
    const botNumber = await askNumber(chalk.hex(generateColor())("Input your bot number..."))
    const timezone = await askTimezone()
    const config = {
        owner: [number],
        prefa: [
          ".",
          "🐦",
          "🐤",
          "🗿",
          "/"
        ],
        author: `Created by Setsu-Bot \nNumber: ${botNumber}`,
        packname: "Setsu-Bot",
        sp: "⭔",
        mess: {
          admin: "Fitur Khusus Admin Group!",
          botAdmin: "Bot Harus Menjadi Admin Terlebih Dahulu!",
          owner: "*_Fitur Hanya bisa diakses oleh Owner Bot_*",
          group: "*_Fitur Digunakan Hanya Untuk Group!_*",
          private: "*_Fitur Digunakan Hanya Untuk Private Chat!_*",
          bot: "Fitur Khusus Pengguna Nomor Bot",
          wait: "*_Tunggu sebentar ya..._*",
          waitM: "```Wait a minute...```",
          failed: "*_Ada kesalahan, coba lagi nanti!_*",
          nolink: "```Send Linknya!```",
          invalid: "*_Invalid URL_*",
          done: "*_Done ya kak!_*"
        },
        url: {
          thumb: "https://raw.githubusercontent.com/anakanj/c24b1a725e817376d636/main/Setsu.jpg"
        },
        autoDownload: true,
        public: true,
        timezone: timezone,
        format: "HH:mm:ss",
        SESSION_FOLDER: "./Data/Session",
        enableLogs: false,
        "terminal.aliases": {
          pull: "git pull https://github.com/Kenzuya/Setsu-MD ",
          restart: "pm2 restart Setsu-Bot"
        }
      }
      existsSync(folder) ? undefined : mkdirSync(folder)
      await writeFile(path.resolve(folder, 'Config.json'), JSON.stringify(config, null, 2))
      console.log(chalk.green(`Configuration files created in `), chalk.yellow(path.resolve(process.cwd(), 'setsu-bot', 'Config', 'Config.json')));
}
/**
 * @param {import("fs").PathOrFileDescriptor} directory
 */
function PatchPackage(directory) {
        return new Promise((resolve) => {
            const data = readFileSync(directory).toString()
            let json = JSON.parse(data)
            json.scripts.start = 'node index.js'
            const packageDetails = JSON.stringify(json, null, 2)
            writeFileSync(directory, packageDetails)
            resolve(undefined)
            
    })
}
await checkDependencies()
// await askNumber();
await downloadScript()
// await extractFiles(readFileSync('./random.zip'), path.resolve('./'))
await createConfigFile(path.resolve(process.cwd(), 'setsu-bot', 'Config'))
await PatchPackage(path.resolve(process.cwd(), 'setsu-bot' ,'package.json'))
console.log(`
${chalk.green('Congratulations, Setsu-Bot is completely installed...')}

${chalk.cyan(`To start Setsu-Bot type `)}${chalk.hex('#30f230')(`"cd setsu-bot && npm start"`)} ${chalk.cyan('in your terminal...')}
${chalk.hex('#fffc5e')('Enjoy your bot😊')}
`)
