const download = require('image-downloader');
const schedule = require('node-schedule');
const moment = require('moment');
const uploadGphotos = require('upload-gphotos');
const creds = require('./creds.json')
const express = require('express')
const app = express()
const port = 3000
let activated = true;
let status = 'OK';

console.log(creds)
app.get('/', (req, res) => res.sendFile('main.html', {root: __dirname }))

app.get('/command/:com', (req, res) => {
	console.log('got command')
	const command = req.params.com
	if(command == 'activate'){
		activated = true;
		console.log('activated')
	} else if(command == 'deactivate'){
		activated = false;
		console.log('deactivated')
	} else if(command == 'capture'){
		go()
	} else{
		return res.status(500).send(status)
	}
	return res.send({activated: activated, status: 'OK'})
})

app.get('/status', (req, res) => res.status(status == 'OK' ? 200 : 500).send({status}))

app.use(express.static(__dirname))

app.listen(port, () => {
	console.log(`Example app listening on port ${port}!`)
	// const j = schedule.scheduleJob('*/1 * * * *', go);
	console.log('yy')
})



async function uploadToDocs(path, gphotos) {
	console.log(__dirname + '/' + path)
	const photo = await gphotos.upload(__dirname + '/' + path);
	const album = await gphotos.searchOrCreateAlbum('Dejligheden 2019');
	return await album.addPhoto(photo);
}
 

const cameras = [
	'http://master.local:8080/capture',
	'http://slave2.local:8080/capture',
	'http://slave3.local:8080/capture',
]


async function go(){
	try{
		console.log('firing')
		const paths = await downloadImages(cameras)
		const gphotos = new uploadGphotos.default({ "username": creds.username, "password": creds.password });
		await gphotos.login();
		console.log('logged in')
		console.log({paths})
		for (let i = 0; i < paths.length; i++) {
			const path = paths[i];
			await uploadToDocs(path, gphotos)

		}

		console.log('succesfully downloaded and uploaded')
		status = 'OK';
	}catch(e){
		console.log(e)
		status = e;

	}
}


async function downloadImages(cameras){
	paths = []
	for (let i = 0; i < cameras.length; i++) {
		try{
			const camera = cameras[i];
			const filename = await downloadImage(camera, i)
			if(filename){
				paths.push( filename )
				console.log({paths});
			}else{
				console.log(camera + ' could not download')
			}
		}catch(e){
			console.log(e);
			status = e;

		}
	}
	
	return paths
}


async function downloadImage(url, i){
	const timeStamp = moment().format('D-hh:mm:ss')
	const options = {
		url,
		timeout: 5000,
		dest: `images/${timeStamp}-photo${i}.jpg`
	}
	try {
		const { filename, image } = await download.image(options)
		return filename
	} catch (e) {
		console.error(e)
		status = e;

	}

}





go()
