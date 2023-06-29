const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require("path")
const fs = require("fs");
const nodemon = require('nodemon');
const app = express();

const readFileExists = async (path) => 
{ 
    await fs.readFile(path, (err, data) => {
        console.log("========= readFileExists ===========");
        try {
            const fileAsBase64 = data.toString('base64');
            console.log(fileAsBase64,"readFileExists");
            return fileAsBase64;
        } catch (err) {
            return err
        }
    });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log(req.body.scanFile, "req.scanFile");
        let newPath = `D:/IMAGE/${req.body.scanFile[0]}`
        fs.mkdirSync(newPath, { recursive: true })
        cb(null, newPath)
    },
    filename: function (req, file, cb) {
        cb(null, req.body.scanFile[1]) //Appending extension
    }
})

const storageByPath = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log(req.body.scanFile, "req.scanFile");
        let newPath = `S:${req.body.scanFile[0]}`
        fs.mkdirSync(newPath, { recursive: true })
        cb(null, newPath)
    },
    filename: function (req, file, cb) {
        cb(null, req.body.scanFile[1]) //Appending extension
    }
})

const fileFilter = (req, file, cb) => {
    const filePath = `D:/IMAGE/${req.body.scanFile[0]}/${req.body.scanFile[1] + path.extname(file.originalname)}`;
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlinkSync(filePath);
        }
        cb(null, true);
    });
};

const fileFilteByPath = (req, file, cb) => {
    const filePath = `S:/IMAGE/${req.body.scanFile[0]}/${req.body.scanFile[1] + path.extname(file.originalname)}`;
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlinkSync(filePath);
        }
        cb(null, true);
    });
};

const upload = multer({ storage, fileFilter });

const uploadByPath = multer()


// enable CORS
app.use(cors());

// add other middleware
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.post('/api/single', async (req, res) => {
    try {
        const avatar = req.file;
        // make sure file is available
        if (!avatar) {
            res.status(200).send({
                status: false,
                data: 'No file is selected.'
            });
        } else {
            //send response
            res.send({
                status: true,
                message: 'File is uploaded.',
                data: {
                    name: avatar.originalname,
                    desname: avatar.filename,
                    mimetype: avatar.mimetype,
                    size: avatar.size
                }
            });
        }

    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/multi_upload', upload.array('scanFile', 12), async (req, res) => {
    try {
        // console.log(req,"req.body");
        // console.log(req.body,"req.params");
        const photos = req.files;
        console.log(photos, "photos");
        // check if photos are available
        if (photos.length == 0) {
            res.status(200).send({
                status: false,
                data: 'No Scan Files is selected.'
            });
        } else {
            let data = [];

            // iterate over all photos
            photos.map(p => data.push({
                name: p.originalname,
                mimetype: p.mimetype,
                size: p.size
            }));

            // send response
            res.status(200).send({
                status: true,
                message: 'Scan Files are uploaded.',
                data: data
            });
        }

    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/multi_uploadByPath', uploadByPath.array('scanFile', 12), async (req, res) => {
    const sourcePath = req.body.scanFile[0]?.replace(/\\\\/g, '\\');;
    const destinationPath = req.body.scanFile[1]?.replace(/\\\\/g, '\\');;
    const isConfirm = req.body.scanFile[2]
    console.log(sourcePath, "sourcePath");
    console.log(destinationPath, "destinationPath");
    console.log(isConfirm, "isConfirm");
    // res.status(200).json({
    //     message:"test",
    //     data:{
    //         sourcePath:sourcePath,
    //         destinationPath:destinationPath
    //     }
    // })
    // return
    if (!sourcePath || !destinationPath) {
        return res.status(400).json({ message: 'Both sourcePath and destinationPath are required' });
    }

    // Check if the source file exists
    if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ message: 'Source file not found' });
    }

    const newFileName = path.basename(destinationPath);
    const newDesPath = path.dirname(destinationPath)
    console.log(newFileName, "newFileName");
    console.log(newDesPath, "newFileName");

    // Create the new destination path with the new file name
    const newFilePath = path.join(newDesPath, newFileName);
    console.log(newFilePath, "newFilePath");

    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(newDesPath)) {
        fs.mkdirSync(newDesPath, { recursive: true });
    }

    // Check if the destination file already exists
    if (fs.existsSync(newFilePath)) {
        // Delete the existing destination file
        console.log("File is exists");
        // fs.unlinkSync(newFilePath);
        // const existsFile = await readFileExists(newFilePath);
        if (isConfirm == "1") {
            console.log(isConfirm, "isConfirm if");
            fs.unlinkSync(newFilePath);
        }else{
            console.log(isConfirm, "isConfirm else");
            return await fs.readFile(newFilePath, (err, data) => {
                console.log("========= readFileExists ===========");
                try {
                    const fileAsBase64 = data.toString('base64');
                    // console.log(fileAsBase64,"readFileExists");
                    // return fileAsBase64;
                    return res.status(200).json({ status:false,message: 'Destination file already exists',file: fileAsBase64,path: newFilePath});
                } catch (err) {
                    return err
                }
            });
        }
        // console.log(existsFile,"existsFile");
        
    }

    // Copy and rename the file
    fs.copyFileSync(sourcePath, newFilePath);

    res.status(200).send(
        {   
            status:true,
            message: 'File copied successfully',
            data: {
                sourcePath: sourcePath,
                destinationPath: destinationPath
            }
        }
    );
});

app.get('/api/file', async (req, res) => {
    const filePath = req.query.filePath;
    console.log(filePath, "test");
    await fs.readFile(`D:/IMAGE${filePath}`, (err, data) => {
        try {
            if (err) {
                res.status(200).send({
                    status: false,
                    error: 'Failed to read file' + err,
                    path: `D:/IMAGE${filePath}`
                });
                return;
            }

            const fileAsBase64 = data.toString('base64');
            res.status(200).send({
                status: true,
                fileAsBase64: fileAsBase64
            });
        } catch (error) {
            res.status(500).send(error);
        }
    });
});

app.get('/api/fileByPath', (req, res) => {
    const filePath = req.query.filePath;
    console.log(filePath, "test");
    fs.readFile(`${filePath}`, (err, data) => {
        try {
            if (err) {
                res.status(400).send({
                    status: false,
                    error: 'Failed to read file' + err,
                    path: `${filePath}`
                });
                return;
            }

            const fileAsBase64 = data.toString('base64');

            res.status(200).send({
                path: `${filePath}`,
                status: true,
                fileAsBase64: fileAsBase64,
            });
        } catch (error) {
            res.status(500).send({
                status: false,
                error: error,
                path: `${filePath}`
            });
        }
    });
});


app.listen(8099, () => {
    console.log('Server is running on port 8099');
});