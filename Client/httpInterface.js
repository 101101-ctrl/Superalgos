exports.newHttpInterface = function newHttpInterface(WEB_SERVER, DATA_FILE_SERVER, PROJECT_FILE_SERVER, UI_FILE_SERVER, PLUGIN_SERVER, CCXT_SERVER, WEB3_SERVER) {

    /*
    IMPORTANT: If you are reviewing the code of the project please note 
    that this file is the single file in the whole system that accumulated
    more technical debt by far. I did not have the time yet to pay the 
    technical debt, and therefore there is a lot to reorganize in here. 
    I will remove this note once this job is done.
    */
    let thisObject = {
        initialize: initialize,
        finalize: finalize,
        run: run
    }

    const open = require('open')

    let port = global.env.HTTP_INTERFACE_PORT

    let http = require('http')
    let isHttpServerStarted = false

    let webhook = new Map()

    return thisObject

    function finalize() {

    }

    function initialize() {

    }

    function run() {
        startHtttpServer()
    }

    function startHtttpServer() {

        try {
            if (isHttpServerStarted === false) {
                gWebServer = http.createServer(onBrowserRequest).listen(port)
                isHttpServerStarted = true
                /* Starting the browser now is optional */
                if (process.argv.includes("noBrowser")) {
                    //Running Client only with no UI.
                } else {
                    open('http://localhost:' + port)
                }

            }
        } catch (err) {
            console.log('[ERROR] httpInterface -> startHtttpServer -> Error = ' + err.stack)
        }
    }

    function onBrowserRequest(httpRequest, httpResponse) {

        function getBody(callback) { // Gets the de body from a POST httpRequest to the web server
            try {

                let body = ''

                httpRequest.on('data', function (data) {
                    body += data
                    // Too much POST data
                    //if (body.length > 1e6) {
                    //    httpRequest.connection.destroy()
                    //}
                })

                httpRequest.on('end', function () {
                    callback(body)
                })

                httpRequest.on('error', function (err) {
                    console.log('[INFO] httpInterface -> onBrowserRequest -> getBody -> err = ' + err.stack)
                    respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                })
            } catch (err) {
                console.log('[INFO] httpInterface -> onBrowserRequest -> getBody -> err = ' + err.stack)
                respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
            }
        }

        let requestParameters = httpRequest.url.split('/')

        requestParameters = httpRequest.url.split('?') // Remove version information
        requestParameters = requestParameters[0].split('/')

        switch (requestParameters[1]) {

            case 'WEB3':
                {
                    getBody(processRequest)

                    async function processRequest(body) {
                        try {
                            let params = JSON.parse(body)

                            switch (params.method) {
                                case 'getNetworkClientStatus': {

                                    let serverResponse = await WEB3_SERVER.getNetworkClientStatus(
                                        params.host,
                                        params.port,
                                        params.interface
                                    )

                                    respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                    return
                                }
                                case 'createWalletAccount': {

                                    let serverResponse = await WEB3_SERVER.createWalletAccount(
                                        params.entropy
                                    )

                                    respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                    return
                                }
                                case 'getWalletBalances': {

                                    let serverResponse = await WEB3_SERVER.getWalletBalances(
                                        params.host,
                                        params.port,
                                        params.interface,
                                        params.walletDefinition
                                    )

                                    respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                    return
                                }
                                case 'signData': {

                                    let serverResponse = await WEB3_SERVER.signData(
                                        params.privateKey,
                                        params.data
                                    )

                                    respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                    return
                                }
                                case 'recoverAddress': {

                                    let serverResponse = await WEB3_SERVER.recoverAddress(
                                        params.signature
                                    )

                                    respondWithContent(JSON.stringify(serverResponse), httpResponse)
                                    return
                                }
                                default: {
                                    respondWithContent(JSON.stringify({ error: 'Method ' + params.method + ' is invalid.' }), httpResponse)
                                }
                            }
                        } catch (err) {
                            console.log('[ERROR] httpInterface -> WEB3s -> Method call produced an error.')
                            console.log('[ERROR] httpInterface -> WEB3s -> err.stack = ' + err.stack)
                            console.log('[ERROR] httpInterface -> WEB3s -> Params Received = ' + body)

                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                    }
                    break
                }

            case 'CCXT':
                {
                    getBody(processRequest)

                    async function processRequest(body) {
                        try {
                            let params = JSON.parse(body)

                            const ccxt = require('ccxt')

                            switch (params.method) {
                                case 'fetchMarkets': {

                                    const exchangeClass = ccxt[params.exchangeId]
                                    const exchangeConstructorParams = {
                                        'timeout': 30000,
                                        'enableRateLimit': true,
                                        verbose: false
                                    }

                                    let ccxtExchange = new exchangeClass(exchangeConstructorParams)
                                    let ccxtMarkets = []

                                    if (ccxtExchange.has.fetchMarkets === true) {
                                        ccxtMarkets = await ccxtExchange.fetchMarkets()
                                    }
                                    respondWithContent(JSON.stringify(ccxtMarkets), httpResponse)
                                    return
                                }
                                case 'listExchanges': {
                                    let exchanges = []
                                    for (let i = 0; i < ccxt.exchanges.length; i++) {
                                        let exchangeId = ccxt.exchanges[i]

                                        const exchangeClass = ccxt[exchangeId]
                                        const exchangeConstructorParams = {
                                            'timeout': 30000,
                                            'enableRateLimit': true,
                                            verbose: false
                                        }
                                        let ccxtExchange
                                        try { ccxtExchange = new exchangeClass(exchangeConstructorParams) }
                                        catch (err) { }
                                        if (ccxtExchange === undefined) { continue }


                                        if (ccxtExchange.has.fetchOHLCV === params.has.fetchOHLCV) {
                                            if (ccxtExchange.has.fetchMarkets === params.has.fetchMarkets) {
                                                if (ccxtExchange.timeframes['1m'] !== undefined) {
                                                    let exchange = {
                                                        name: ccxtExchange.name,
                                                        id: ccxtExchange.id
                                                    }
                                                    exchanges.push(exchange)
                                                }
                                            }
                                        }
                                    }
                                    respondWithContent(JSON.stringify(exchanges), httpResponse)
                                    return
                                }
                            }

                            let content = {
                                err: global.DEFAULT_FAIL_RESPONSE // method not supported
                            }
                        } catch (err) {
                            console.log('[INFO] httpInterface -> CCXT FetchMarkets -> Could not fetch markets.')
                            let error = {
                                result: 'Fail Because',
                                message: err.message
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                    }
                    break
                }
                break

            case 'Webhook':
                {
                    switch (requestParameters[2]) { // switch by command
                        case 'Fetch-Messages': {
                            let exchange = requestParameters[3]
                            let market = requestParameters[4]

                            /* Some validations */
                            if (exchange === undefined) {
                                console.log('[WARN] httpInterface -> Webhook -> Fetch-Messages -> Message with no Exchange received -> messageReceived = ' + messageReceived)
                                respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                return
                            }
                            if (market === undefined) {
                                console.log('[WARN] httpInterface -> Webhook -> Fetch-Messages -> Message with no market received -> messageReceived = ' + messageReceived)
                                respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                return
                            }

                            let key = exchange + '-' + market

                            let webhookMessages = webhook.get(key)
                            if (webhookMessages === undefined) {
                                webhookMessages = []
                            }

                            console.log('[INFO] httpInterface -> Webhook -> Fetch-Messages -> Exchange-Market = ' + exchange + '-' + market)
                            console.log('[INFO] httpInterface -> Webhook -> Fetch-Messages -> Messeges Fetched by Webhooks Sensor Bot = ' + webhookMessages.length)

                            respondWithContent(JSON.stringify(webhookMessages), httpResponse)
                            webhookMessages = []

                            webhook.set(key, webhookMessages)
                            break
                        }
                        case 'New-Message': {
                            getBody(processRequest)

                            function processRequest(messageReceived) {
                                let timestamp = (new Date()).valueOf()
                                let source = requestParameters[3]
                                let exchange = requestParameters[4]
                                let market = requestParameters[5]

                                /* Some validations */
                                if (source === undefined) {
                                    console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no Source received -> messageReceived = ' + messageReceived)
                                    respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }
                                if (exchange === undefined) {
                                    console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no Exchange received -> messageReceived = ' + messageReceived)
                                    respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }
                                if (market === undefined) {
                                    console.log('[WARN] httpInterface -> Webhook -> New-Message -> Message with no market received -> messageReceived = ' + messageReceived)
                                    respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                }

                                let key = exchange + '-' + market

                                let webhookMessages = webhook.get(key)
                                if (webhookMessages === undefined) {
                                    webhookMessages = []
                                }

                                webhookMessages.push([timestamp, source, messageReceived])
                                webhook.set(key, webhookMessages)

                                console.log('[INFO] httpInterface -> Webhook -> New-Message -> Exchange-Market = ' + exchange + '-' + market)
                                console.log('[INFO] httpInterface -> Webhook -> New-Message -> messageReceived = ' + messageReceived)
                                console.log('[INFO] httpInterface -> Webhook -> New-Message -> Messeges waiting to be Fetched by Webhooks Sensor Bot = ' + webhookMessages.length)
                                respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                            }
                            break
                        }
                    }
                    break
                }
                break

            case 'Docs':
                {
                    switch (requestParameters[2]) { // switch by command
                        case 'Save-Node-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Nodes'

                                    if (checkAllSchmemaDocuments('Node', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Node-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                        case 'Save-Concept-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Concepts'

                                    if (checkAllSchmemaDocuments('Concept', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Concept-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                        case 'Save-Topic-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Topics'

                                    if (checkAllSchmemaDocuments('Topic', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Topic-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                        case 'Save-Tutorial-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Tutorials'

                                    if (checkAllSchmemaDocuments('Tutorial', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Tutorial-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                        case 'Save-Review-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Reviews'

                                    if (checkAllSchmemaDocuments('Review', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Review-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                        case 'Save-Book-Schema': {
                            getBody(processRequest)

                            async function processRequest(body) {
                                try {
                                    let docsSchema = JSON.parse(body)
                                    let project = requestParameters[3]
                                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Schemas/Docs-Books'

                                    if (checkAllSchmemaDocuments('Book', docsSchema, filePath) === true) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    }

                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> Docs -> Save-Book-Schema -> Params Received = ' + body)

                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                }
                            }
                            break
                        }
                    }

                    function checkAllSchmemaDocuments(category, docsSchema, filePath) {
                        const fs = require('fs')
                        let noErrorsDuringSaving = true

                        for (let i = 0; i < docsSchema.length; i++) {
                            let schemaDocument = docsSchema[i]
                            /*
                            For some type of schemas we will save the file at an extra
                            folder derived from the document's type.
                            */
                            let fileName = schemaDocument.type.toLowerCase()
                            for (let j = 0; j < 10; j++) {
                                fileName = cleanFileName(fileName)
                            }
                            let pageNumber = '00' + schemaDocument.pageNumber
                            let newFilepath = filePath
                            switch (category) {
                                case 'Topic': {
                                    fileName = schemaDocument.topic.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                    fileName = cleanFileName(fileName)
                                    newFilepath = createPrefixDirectories(filePath, schemaDocument.topic)
                                    break
                                }
                                case 'Tutorial': {
                                    fileName = schemaDocument.tutorial.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                    fileName = cleanFileName(fileName)
                                    newFilepath = createPrefixDirectories(filePath, schemaDocument.tutorial)
                                    break
                                }
                                case 'Review': {
                                    fileName = schemaDocument.review.toLowerCase() + '-' + pageNumber.substring(pageNumber.length - 3, pageNumber.length) + '-' + schemaDocument.type.toLowerCase()
                                    fileName = cleanFileName(fileName)
                                    newFilepath = createPrefixDirectories(filePath, schemaDocument.review)
                                    break
                                }
                                case 'Node': {
                                    newFilepath = createPrefixDirectories(filePath, schemaDocument.type)
                                    break
                                }
                                case 'Concept': {
                                    newFilepath = createPrefixDirectories(filePath, schemaDocument.type)
                                    break
                                }
                            }

                            function createPrefixDirectories(filePath, schemaTextToUse) {
                                let firstLetter = schemaTextToUse.substring(0, 1)
                                createNewDir(filePath + '/' + firstLetter)
                                let extraWord = schemaTextToUse.split(' ')[0]
                                createNewDir(filePath + '/' + firstLetter + '/' + extraWord)
                                return filePath + '/' + firstLetter + '/' + extraWord + '/' + cleanFileName(schemaTextToUse)
                            }

                            fileName = fileName + '.json'

                            if (schemaDocument.deleted === true) {
                                try {
                                    fs.unlinkSync(newFilepath + '/' + fileName)
                                    console.log('[SUCCESS] ' + newFilepath + '/' + fileName + ' deleted.')
                                } catch (err) {
                                    noErrorsDuringSaving = false
                                    console.log('[ERROR] httpInterface -> Docs -> Delete -> ' + newFilepath + '/' + fileName + ' could not be deleted.')
                                    console.log('[ERROR] httpInterface -> Docs -> Delete -> Resolve the issue that is preventing the Client to delete this file. Look at the error message below as a guide. At the UI you will need to delete this page again in order for the Client to retry next time you execute the docs.save command.')
                                    console.log('[ERROR] httpInterface -> Docs -> Delete -> err.stack = ' + err.stack)
                                }
                            } else {
                                if (schemaDocument.updated === true || schemaDocument.created === true) {
                                    try {
                                        let created = schemaDocument.created
                                        let updated = schemaDocument.updated
                                        schemaDocument.updated = undefined
                                        schemaDocument.created = undefined
                                        let fileContent = JSON.stringify(schemaDocument, undefined, 4)
                                        createNewDir(newFilepath)
                                        fs.writeFileSync(newFilepath + '/' + fileName, fileContent)
                                        if (created === true) {
                                            console.log('[SUCCESS] ' + newFilepath + '/' + fileName + '  created.')
                                        } else {
                                            if (updated === true) {
                                                console.log('[SUCCESS] ' + newFilepath + '/' + fileName + '  updated.')
                                            }
                                        }
                                    } catch (err) {
                                        noErrorsDuringSaving = false
                                        console.log('[ERROR] httpInterface -> Docs -> Save -> ' + newFilepath + '/' + fileName + ' could not be created / updated.')
                                        console.log('[ERROR] httpInterface -> Docs -> Save -> err.stack = ' + err.stack)
                                    }
                                }
                            }

                            function createNewDir(path) {
                                try {
                                    fs.mkdirSync(path)
                                } catch (err) {
                                    if (err.message.indexOf('file already exists') < 0) {
                                        throw (err)
                                    }
                                }
                            }
                        }

                        return noErrorsDuringSaving
                    }

                    function cleanFileName(fileName) {
                        for (let i = 0; i < 100; i++) {
                            fileName = fileName
                                .replace(' ', '-')
                                .replace('--', '-')
                                .replace('?', '')
                                .replace('#', '')
                                .replace('$', '')
                                .replace('%', '')
                                .replace('^', '')
                                .replace('&', '')
                                .replace('*', '')
                                .replace('(', '')
                                .replace(')', '')
                                .replace('!', '')
                                .replace('..', '.')
                                .replace(',', '')
                                .replace('\'', '')
                        }
                        return fileName
                    }
                }
                break

            case 'App': {
                switch (requestParameters[2]) { // switch by command
                    case 'Contribute': {
                        try {
                            let commitMessage = unescape(requestParameters[3])
                            const username = unescape(requestParameters[4])
                            const token = unescape(requestParameters[5])
                            const currentBranch = unescape(requestParameters[6])
                            const contributionsBranch = unescape(requestParameters[7])
                            let error

                            /* Unsavping # */
                            for (let i = 0; i < 10; i++) {
                                commitMessage = commitMessage.replace('_SLASH_', '/')
                                commitMessage = commitMessage.replace('_HASHTAG_', '#')
                            }

                            contribute()

                            async function contribute() {
                                const { lookpath } = require('lookpath');
                                const gitpath = await lookpath('git');
                                if (gitpath === undefined) {
                                    console.log('[ERROR] `git` not installed.')
                                } else {
                                    await doGit()
                                    if (error !== undefined) {

                                        let docs = {
                                            project: 'Foundations',
                                            category: 'Topic',
                                            type: 'App Error - Contribution Not Sent',
                                            anchor: undefined,
                                            placeholder: {}
                                        }

                                        respondWithDocsObject(docs, error)
                                        return
                                    }

                                    await doGithub()
                                    if (error !== undefined) {

                                        let docs = {
                                            project: 'Foundations',
                                            category: 'Topic',
                                            type: 'App Error - Contribution Not Sent',
                                            anchor: undefined,
                                            placeholder: {}
                                        }
                                        console.log('respond with docs ')

                                        respondWithDocsObject(docs, error)
                                        return
                                    }
                                    respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                }
                            }

                            async function doGit() {
                                const simpleGit = require('simple-git');
                                const options = {
                                    baseDir: process.cwd(),
                                    binary: 'git',
                                    maxConcurrentProcesses: 6,
                                }
                                const git = simpleGit(options)

                                try {
                                    await git.add('./*')
                                    await git.commit(commitMessage)
                                    await git.push('origin', currentBranch)
                                } catch (err) {
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> Method call produced an error.')
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> err.stack = ' + err.stack)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> commitMessage = ' + commitMessage)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> currentBranch = ' + currentBranch)
                                    console.log('[ERROR] httpInterface -> App -> Contribute -> doGit -> contributionsBranch = ' + contributionsBranch)
                                    error = err
                                }
                            }

                            async function doGithub() {

                                const { Octokit } = require("@octokit/rest")

                                const octokit = new Octokit({
                                    auth: token,
                                    userAgent: 'Superalgos Beta 11'
                                })

                                const repo = 'Superalgos'
                                const owner = 'Superalgos'
                                const head = username + ':' + contributionsBranch
                                const base = currentBranch
                                const title = 'Contribution: ' + commitMessage

                                try {
                                    await octokit.pulls.create({
                                        owner,
                                        repo,
                                        title,
                                        head,
                                        base,
                                    });
                                } catch (err) {
                                    if (err.stack.indexOf('A pull request already exists') >= 0) {
                                        return
                                    } else {
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> Method call produced an error.')
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> err.stack = ' + err.stack)
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> commitMessage = ' + commitMessage)
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> username = ' + username)
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> token starts with = ' + token.substring(0, 10) + '...')
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> token ends with = ' + '...' + token.substring(token.length - 10))
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> currentBranch = ' + currentBranch)
                                        console.log('[ERROR] httpInterface -> App -> Contribute -> doGithub -> contributionsBranch = ' + contributionsBranch)
                                        error = err
                                    }
                                }
                            }

                        } catch (err) {
                            console.log('[ERROR] httpInterface -> App -> Contribute -> Method call produced an error.')
                            console.log('[ERROR] httpInterface -> App -> Contribute -> err.stack = ' + err.stack)
                            console.log('[ERROR] httpInterface -> App -> Contribute -> commitMessage = ' + commitMessage)
                            console.log('[ERROR] httpInterface -> App -> Contribute -> username = ' + username)
                            console.log('[ERROR] httpInterface -> App -> Contribute -> token starts with = ' + token.substring(0, 10) + '...')
                            console.log('[ERROR] httpInterface -> App -> Contribute -> token ends with = ' + '...' + token.substring(token.length - 10))
                            console.log('[ERROR] httpInterface -> App -> Contribute -> currentBranch = ' + currentBranch)
                            console.log('[ERROR] httpInterface -> App -> Contribute -> contributionsBranch = ' + contributionsBranch)

                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                        break
                    }

                    case 'Update': {
                        try {
                            const currentBranch = unescape(requestParameters[3])
                            update()

                            async function update() {
                                const { lookpath } = require('lookpath');
                                const gitpath = await lookpath('git');
                                if (gitpath === undefined) {
                                    console.log('[ERROR] `git` not installed.')
                                } else {
                                    let result = await doGit()

                                    if (result.error === undefined) {
                                        let customResponse = {
                                            result: global.CUSTOM_OK_RESPONSE.result,
                                            message: result.message
                                        }
                                        respondWithContent(JSON.stringify(customResponse), httpResponse)
                                    } else {

                                        let docs = {
                                            project: 'Foundations',
                                            category: 'Topic',
                                            type: 'App Error - Update Failed',
                                            anchor: undefined,
                                            placeholder: {}
                                        }

                                        respondWithDocsObject(docs, result.error)

                                    }
                                }
                            }

                            async function doGit() {
                                const simpleGit = require('simple-git');
                                const options = {
                                    baseDir: process.cwd(),
                                    binary: 'git',
                                    maxConcurrentProcesses: 6,
                                }
                                const git = simpleGit(options)

                                let message
                                try {
                                    message = await git.pull('https://github.com/Superalgos/Superalgos', currentBranch)
                                    return { message: message }
                                } catch (err) {
                                    console.log('[ERROR] Error updating ' + currentBranch)
                                    console.log(err.stack)
                                    return { error: err }
                                }
                            }

                        } catch (err) {
                            console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                            console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                        break
                    }

                    case 'Checkout': {
                        try {
                            const currentBranch = unescape(requestParameters[3])
                            let error

                            checkout()

                            async function checkout() {
                                const { lookpath } = require('lookpath');
                                const gitpath = await lookpath('git');
                                if (gitpath === undefined) {
                                    console.log('[ERROR] `git` not installed.')
                                } else {
                                    await doGit()

                                    if (error === undefined) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                    } else {
                                        let docs = {
                                            project: 'Foundations',
                                            category: 'Topic',
                                            type: 'Switching Branches - Current Branch Not Changed',
                                            anchor: undefined,
                                            placeholder: {}
                                        }

                                        respondWithDocsObject(docs, error)
                                    }
                                }
                            }

                            async function doGit() {
                                const simpleGit = require('simple-git');
                                const options = {
                                    baseDir: process.cwd(),
                                    binary: 'git',
                                    maxConcurrentProcesses: 6,
                                }
                                const git = simpleGit(options)
                                try {
                                    await git.checkout(currentBranch)
                                } catch (err) {
                                    console.log('[ERROR] Error changing current branch to ' + currentBranch)
                                    console.log(err.stack)
                                    error = err
                                }
                            }

                        } catch (err) {
                            console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                            console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                        break
                    }

                    case 'Branch': {
                        try {
                            branch()

                            async function branch() {
                                const { lookpath } = require('lookpath');
                                const gitpath = await lookpath('git');
                                if (gitpath === undefined) {
                                    console.log('[ERROR] `git` not installed.')
                                } else {
                                    let result = await doGit()

                                    if (result.error === undefined) {
                                        let customResponse = {
                                            result: global.CUSTOM_OK_RESPONSE.result,
                                            message: result
                                        }
                                        respondWithContent(JSON.stringify(customResponse), httpResponse)
                                    } else {
                                        let docs = {
                                            project: 'Foundations',
                                            category: 'Topic',
                                            type: 'App Error - Could Not Get Current Branch',
                                            anchor: undefined,
                                            placeholder: {}
                                        }

                                        respondWithDocsObject(docs, error)
                                    }
                                }
                            }

                            async function doGit() {
                                const simpleGit = require('simple-git');
                                const options = {
                                    baseDir: process.cwd(),
                                    binary: 'git',
                                    maxConcurrentProcesses: 6,
                                }
                                const git = simpleGit(options)
                                try {
                                    return await git.branch()
                                } catch (err) {
                                    console.log('[ERROR] Error reading current branch.')
                                    console.log(err.stack)
                                }
                            }

                        } catch (err) {
                            console.log('[ERROR] httpInterface -> App -> Update -> Method call produced an error.')
                            console.log('[ERROR] httpInterface -> App -> Update -> err.stack = ' + err.stack)

                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                        break
                    }
                }

                function respondWithDocsObject(docs, error) {

                    if (error.message !== undefined) {
                        docs.placeholder.errorMessage = {
                            style: 'Error',
                            text: error.message
                        }
                    }
                    if (error.stack !== undefined) {
                        docs.placeholder.errorStack = {
                            style: 'Javascript',
                            text: error.stack
                        }
                    }
                    if (error.code !== undefined) {
                        docs.placeholder.errorCode = {
                            style: 'Json',
                            text: error.code
                        }
                    }

                    docs.placeholder.errorDetails = {
                        style: 'Json',
                        text: JSON.stringify(error, undefined, 4)
                    }

                    let customResponse = {
                        result: global.CUSTOM_FAIL_RESPONSE.result,
                        docs: docs
                    }

                    respondWithContent(JSON.stringify(customResponse), httpResponse)

                }
            }
                break

            case 'Gov': {
                switch (requestParameters[2]) { // switch by command
                    case 'getGithubStars': {
                        getGithubUsernames('activity', 'listStargazersForRepo')
                        break
                    }
                    case 'getGithubWatchers': {
                        getGithubUsernames('activity', 'listWatchersForRepo')
                        break
                    }
                    case 'getGithubForks': {
                        getGithubUsernames('repos', 'listForks')
                        break
                    }
                    case 'PRs': {
                        mergeGithubPullRequests()
                        break
                    }
                    case 'Pay': {
                        payToContributors()
                        break
                    }
                }

                function getGithubUsernames(endpoint, method) {
                    try {
                        const GITHUB_API_WAITING_TIME = 250
                        const repository = unescape(requestParameters[3])
                        const username = unescape(requestParameters[4])
                        const token = unescape(requestParameters[5])
                        let error
                        let githubListArray = []

                        getRepoInfo()

                        async function getRepoInfo() {
                            await doGithub()
                            if (error !== undefined) {

                                let docs = {
                                    project: 'Governance',
                                    category: 'Topic',
                                    type: 'Gov Error - Get Repository Information',
                                    anchor: undefined,
                                    placeholder: {}
                                }

                                respondWithDocsObject(docs, error)
                                return
                            }

                            respondWithContent(JSON.stringify(githubListArray), httpResponse)
                        }

                        async function doGithub() {

                            const { Octokit } = require("@octokit/rest")

                            const octokit = new Octokit({
                                auth: token,
                                userAgent: 'Superalgos Beta 11'
                            })
                            await getList()

                            async function getList() {
                                const repo = repository
                                const owner = 'Superalgos'
                                const per_page = 100 // Max
                                let page = 0
                                let lastPage = false

                                while (lastPage === false) {
                                    try {
                                        page++
                                        await sleep(GITHUB_API_WAITING_TIME)
                                        let listResponse = await octokit[endpoint][method]({
                                            owner,
                                            repo,
                                            per_page,
                                            page
                                        });

                                        if (listResponse.data.length < 100) {
                                            lastPage = true
                                        }

                                        for (let i = 0; i < listResponse.data.length; i++) {
                                            let listItem = listResponse.data[i]
                                            let githubUsername
                                            switch (endpoint) {
                                                case 'activity': {
                                                    githubUsername = listItem.login
                                                    break
                                                }
                                                case 'repos': {
                                                    githubUsername = listItem.owner.login
                                                    break
                                                }
                                            }
                                            //console.log(listItem)

                                            githubListArray.push(githubUsername)
                                        }
                                        console.log('[INFO] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList -> ' + method + ' Page = ' + page)
                                        console.log('[INFO] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList -> ' + method + ' Received = ' + listResponse.data.length)

                                    } catch (err) {
                                        console.log(err)

                                        if (err.stack.indexOf('last page') >= 0) {
                                            return
                                        } else {
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->Method call produced an error.')
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->err.stack = ' + err.stack)
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->repository = ' + repository)
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->username = ' + username)
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->token starts with = ' + token.substring(0, 10) + '...')
                                            console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> doGithub -> getList ->token ends with = ' + '...' + token.substring(token.length - 10))
                                            error = err
                                        }
                                    }
                                }
                            }
                        }

                    } catch (err) {
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> Method call produced an error.')
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> err.stack = ' + err.stack)
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> repository = ' + repository)
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> username = ' + username)
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> token starts with = ' + token.substring(0, 10) + '...')
                        console.log('[ERROR] httpInterface -> Gov -> getRepoInfo -> token ends with = ' + '...' + token.substring(token.length - 10))

                        let error = {
                            result: 'Fail Because',
                            message: err.message,
                            stack: err.stack
                        }
                        respondWithContent(JSON.stringify(error), httpResponse)
                    }
                }

                function respondWithDocsObject(docs, error) {

                    if (error.message !== undefined) {
                        docs.placeholder.errorMessage = {
                            style: 'Error',
                            text: error.message
                        }
                    }
                    if (error.stack !== undefined) {
                        docs.placeholder.errorStack = {
                            style: 'Javascript',
                            text: error.stack
                        }
                    }
                    if (error.code !== undefined) {
                        docs.placeholder.errorCode = {
                            style: 'Json',
                            text: error.code
                        }
                    }

                    docs.placeholder.errorDetails = {
                        style: 'Json',
                        text: JSON.stringify(error, undefined, 4)
                    }

                    let customResponse = {
                        result: global.CUSTOM_FAIL_RESPONSE.result,
                        docs: docs
                    }

                    respondWithContent(JSON.stringify(customResponse), httpResponse)

                }

                function mergeGithubPullRequests() {
                    try {
                        let commitMessage = unescape(requestParameters[3])

                        /* Unsavping # */
                        for (let i = 0; i < 10; i++) {
                            commitMessage = commitMessage.replace('_SLASH_', '/')
                            commitMessage = commitMessage.replace('_HASHTAG_', '#')
                        }

                        const GITHUB_API_WAITING_TIME = 250
                        const repository = 'Superalgos'
                        const username = unescape(requestParameters[4])
                        const token = unescape(requestParameters[5])

                        let error
                        let githubPrListArray = []

                        processOpenPullRequests()

                        async function processOpenPullRequests() {
                            await doGithub()
                            if (error !== undefined) {

                                let docs = {
                                    project: 'Governance',
                                    category: 'Topic',
                                    type: 'Gov Error - Merge Pull Requests',
                                    anchor: undefined,
                                    placeholder: {}
                                }

                                respondWithDocsObject(docs, error)
                                return
                            }

                            respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                        }

                        async function doGithub() {
                            try {
                                const repo = repository
                                const owner = 'Superalgos'
                                const { Octokit } = require("@octokit/rest")
                                const octokit = new Octokit({
                                    auth: token,
                                    userAgent: 'Superalgos Beta 11'
                                })
                                await getPrList()
                                await mergePrs()

                                async function getPrList() {

                                    const per_page = 100 // Max
                                    let page = 0
                                    let lastPage = false

                                    while (lastPage === false) {
                                        try {
                                            page++

                                            await sleep(GITHUB_API_WAITING_TIME)
                                            let listResponse = await octokit.rest.pulls.list({
                                                owner: owner,
                                                repo: repo,
                                                state: 'open',
                                                head: 'develop',
                                                base: 'develop',
                                                sort: undefined,
                                                direction: undefined,
                                                per_page: per_page,
                                                page: page
                                            });

                                            if (listResponse.data.length < 100) {
                                                lastPage = true
                                            }
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList -> Receiving Page = ' + page)
                                            for (let i = 0; i < listResponse.data.length; i++) {
                                                let pullRequest = listResponse.data[i]
                                                console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList -> Pull Request "' + pullRequest.title + '" found and added to the list to validate. ')
                                                githubPrListArray.push(pullRequest)
                                            }
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList -> Received = ' + listResponse.data.length)

                                        } catch (err) {
                                            console.log(err)

                                            if (err.stack.indexOf('last page') >= 0) {
                                                return
                                            } else {
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->Method call produced an error.')
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->err.stack = ' + err.stack)
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->repository = ' + repository)
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->username = ' + username)
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->token starts with = ' + token.substring(0, 10) + '...')
                                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> getPrList ->token ends with = ' + '...' + token.substring(token.length - 10))
                                                error = err
                                            }
                                        }
                                    }
                                }

                                async function mergePrs() {
                                    /*
                                    In order to automatically merge a PRs we will run several validations first.
                                    We want to automate specifically the merging of Profile File changes at the
                                    Governance System done by the same Github user name that matches the profile
                                    changed. We will also not do the merge if there are more than one file at the 
                                    PR. 
    
                                    We will go through the list of open PRs and run the validations at each one of them.
                                    */
                                    console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Ready to Validate ' + githubPrListArray.length + ' pull requests. ')

                                    for (let i = 0; i < githubPrListArray.length; i++) {
                                        let pullRequest = githubPrListArray[i]
                                        /*
                                        Lets get the files changed at this Pull Request.
                                        */
                                        await sleep(GITHUB_API_WAITING_TIME)
                                        let listResponse = await octokit.rest.pulls.listFiles({
                                            owner: owner,
                                            repo: repo,
                                            pull_number: pullRequest.number
                                        });
                                        /*
                                        Validation #1: If the PR has more than one file, then we will not automatically
                                        merge it.
                                        */
                                        if (listResponse.data.length !== 1) {
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Validation #1 Failed -> Pull Request "' + pullRequest.title + '" not merged because it contains more than 1 file. -> fileCount = ' + listResponse.data.length)
                                            /*
                                            We will close PRs that contains any User Profile file together with other files in the same Pull Request.
                                            This will avoid manual merges to include User Profile files.
                                            */
                                            for (j = 0; j < listResponse.data.length; j++) {
                                                let pullRequestFile = listResponse.data[j]
                                                let fileContentUrl = pullRequestFile.raw_url
                                                if (fileContentUrl.indexOf('Governance/Plugins/User-Profiles') >= 0) {
                                                    await sleep(GITHUB_API_WAITING_TIME)
                                                    await octokit.rest.issues.createComment({
                                                        owner: owner,
                                                        repo: repo,
                                                        issue_number: pullRequest.number,
                                                        body: 'This Pull Request could not be automatically merged and was closed by the Superalgos Governance System because it was detected that a User Profile file... \n\n' + fileContentUrl + '\n\n...was submitted together with  ' + (listResponse.data.length - 1) + ' other file/s. User Profiles files as per the Governance System rules, must be the only file present at a Pull Request in order to pass all the validations and be automatically merged.'
                                                    });

                                                    await sleep(GITHUB_API_WAITING_TIME)
                                                    await octokit.rest.pulls.update({
                                                        owner: owner,
                                                        repo: repo,
                                                        pull_number: pullRequest.number,
                                                        state: 'closed'
                                                    });
                                                    break
                                                }
                                            }
                                            continue
                                        }
                                        let pullRequestFile = listResponse.data[0]
                                        /*
                                        Validation #2: File Name must be the same to the Github Username of the PR owner.
                                        */
                                        let fileContentUrl = pullRequestFile.raw_url

                                        if (fileContentUrl.indexOf('Governance/Plugins/User-Profiles') < 0) {
                                            /*
                                            If it is not a user profile then there is no need to auto merge.
                                            */
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Validation #2 Failed -> Pull Request "' + pullRequest.title + '" not merged because the file modified at the Pull Request is not a User Profile file. -> fileContentUrl = ' + fileContentUrl)
                                            continue
                                        }

                                        let splittedURL = fileContentUrl.split('/')
                                        let fileName = splittedURL[splittedURL.length - 1]
                                        let splittedFileName = fileName.split('.')
                                        fileName = splittedFileName[0]
                                        let githubUsername = pullRequest.user.login

                                        if (githubUsername !== fileName) {
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Validation #2 Failed -> Pull Request "' + pullRequest.title + '" not merged because the Github Username is not equal to the File Name. -> Github Username = ' + githubUsername + '-> fileName = ' + fileName)

                                            await sleep(GITHUB_API_WAITING_TIME)
                                            await octokit.rest.issues.createComment({
                                                owner: owner,
                                                repo: repo,
                                                issue_number: pullRequest.number,
                                                body: 'This Pull Request could not be automatically merged and was closed by the Superalgos Governance System because it was detected that the Github User "' + githubUsername + '" who submitted it, is not equal to the name of the User Profile Plugin File.\n\n File Name = "' + fileName + '"'
                                            });

                                            await sleep(GITHUB_API_WAITING_TIME)
                                            await octokit.rest.pulls.update({
                                                owner: owner,
                                                repo: repo,
                                                pull_number: pullRequest.number,
                                                state: 'closed'
                                            });
                                            continue
                                        }
                                        await sleep(GITHUB_API_WAITING_TIME)
                                        let fileContent = await fetchAPIDataFile(fileContentUrl)

                                        let userProfile = JSON.parse(fileContent)
                                        /*
                                        Validation #3: The file changed at the PR is a User Profile.
                                        */
                                        if (userProfile.type !== 'User Profile') {
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Validation #3 Failed -> Pull Request "' + pullRequest.title + '" not merged because the file modified is not a User Profile. -> Type = ' + userProfile.type)
                                            continue
                                        }
                                        /*
                                        Validation #4: The message signed at the config is not the Github Username.
                                        */
                                        let config = JSON.parse(userProfile.config)
                                        let messageSigned = config.signature.message
                                        if (messageSigned !== githubUsername) {
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Validation #4 Failed -> Pull Request "' + pullRequest.title + '" not merged because the Github Username is not equal to the Message Signed at the User Profile. -> Github Username = ' + githubUsername + '-> messageSigned = ' + messageSigned)

                                            await sleep(GITHUB_API_WAITING_TIME)
                                            await octokit.rest.issues.createComment({
                                                owner: owner,
                                                repo: repo,
                                                issue_number: pullRequest.number,
                                                body: 'This Pull Request could not be automatically merged and was closed by the Superalgos Governance System because it was detected that the Github User "' + githubUsername + '" who submitted it, is not equal to the Message Signed at the User Profile.\n\n Message Signed = "' + messageSigned + '"'
                                            });

                                            await sleep(GITHUB_API_WAITING_TIME)
                                            await octokit.rest.pulls.update({
                                                owner: owner,
                                                repo: repo,
                                                pull_number: pullRequest.number,
                                                state: 'closed'
                                            });
                                            continue
                                        }
                                        /*
                                        All validations passed, we will proceed an merge this Pull Request.
                                        */
                                        await sleep(GITHUB_API_WAITING_TIME)
                                        let mergeResponse = await octokit.rest.pulls.merge({
                                            owner: owner,
                                            repo: repo,
                                            pull_number: pullRequest.number,
                                            commit_title: 'Changes in User Profile done by Profile Owner ' + githubUsername + ' automatically merged by Superalgos.'
                                        });

                                        if (mergeResponse.data.merged !== true) {
                                            console.log('[WARN] httpInterface -> Gov -> mergeGithubPullRequests -> Merge Failed -> Pull Request "' + pullRequest.title + '" not merged because Github could not merge it. -> mergeResponse.message = ' + mergeResponse.data.message)
                                            continue
                                        } else {
                                            console.log('[INFO] httpInterface -> Gov -> mergeGithubPullRequests -> Merge Succed -> Pull Request "' + pullRequest.title + '" successfully merged. -> mergeResponse.message = ' + mergeResponse.data.message)
                                            await sleep(GITHUB_API_WAITING_TIME)
                                            await octokit.rest.issues.createComment({
                                                owner: owner,
                                                repo: repo,
                                                issue_number: pullRequest.number,
                                                body: 'This Pull Request was automatically merged by the Superalgos Governance System because it was detected that the Github User " ' + githubUsername + '" who submitted it, modified its own User Profile Plugin File and nothning else but that file. All validations were successfull.'
                                            });
                                            continue
                                        }
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> doGithub -> err.stack = ' + err.stack)
                            }
                        }

                    } catch (err) {
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> Method call produced an error.')
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> err.stack = ' + err.stack)
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> repository = ' + repository)
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> username = ' + username)
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> token starts with = ' + token.substring(0, 10) + '...')
                        console.log('[ERROR] httpInterface -> Gov -> mergeGithubPullRequests -> token ends with = ' + '...' + token.substring(token.length - 10))

                        let error = {
                            result: 'Fail Because',
                            message: err.message,
                            stack: err.stack
                        }
                        respondWithContent(JSON.stringify(error), httpResponse)
                    }
                }

                function payToContributors() {

                }
            }
                break

            case 'LegacyPlotter.js':
                {
                    respondWithFile(global.env.PATH_TO_CLIENT + 'WebServer/LegacyPlotter.js', httpResponse)
                }
                break

            case 'PlotterPanel.js':
                {
                    respondWithFile(global.env.PATH_TO_CLIENT + 'WebServer/PlotterPanel.js', httpResponse)
                }
                break

            case 'Images': // This means the Images folder.
                {
                    let path = global.env.PATH_TO_CLIENT + 'WebServer/Images/' + requestParameters[2]

                    if (requestParameters[3] !== undefined) {
                        path = path + '/' + requestParameters[3]
                    }

                    if (requestParameters[4] !== undefined) {
                        path = path + '/' + requestParameters[4]
                    }

                    if (requestParameters[5] !== undefined) {
                        path = path + '/' + requestParameters[5]
                    }

                    path = unescape(path)

                    respondWithImage(path, httpResponse)
                }
                break

            case 'Icons': // This means the Icons folder under Projects.
                {
                    let path = global.env.PATH_TO_PROJECTS + '/' + requestParameters[2] + '/Icons'

                    if (requestParameters[3] !== undefined) {
                        path = path + '/' + requestParameters[3]
                    }

                    if (requestParameters[4] !== undefined) {
                        path = path + '/' + requestParameters[4]
                    }

                    if (requestParameters[5] !== undefined) {
                        path = path + '/' + requestParameters[5]
                    }

                    path = unescape(path)

                    respondWithImage(path, httpResponse)
                }
                break

            case 'GIFs': // This means the GIFs folder under Projects.
                {
                    let path = global.env.PATH_TO_PROJECTS + '/' + requestParameters[2] + '/GIFs'

                    if (requestParameters[3] !== undefined) {
                        path = path + '/' + requestParameters[3]
                    }

                    if (requestParameters[4] !== undefined) {
                        path = path + '/' + requestParameters[4]
                    }

                    if (requestParameters[5] !== undefined) {
                        path = path + '/' + requestParameters[5]
                    }

                    path = unescape(path)
                    respondWithImage(path, httpResponse)
                }
                break

            case 'PNGs': // This means the PNGs folder under Projects.
                {
                    let path = global.env.PATH_TO_PROJECTS + '/' + requestParameters[2] + '/PNGs'

                    if (requestParameters[3] !== undefined) {
                        path = path + '/' + requestParameters[3]
                    }

                    if (requestParameters[4] !== undefined) {
                        path = path + '/' + requestParameters[4]
                    }

                    if (requestParameters[5] !== undefined) {
                        path = path + '/' + requestParameters[5]
                    }

                    path = unescape(path)
                    respondWithImage(path, httpResponse)
                }
                break

            case 'favicon.ico': // This means the Scripts folder.
                {
                    respondWithImage(global.env.PATH_TO_CLIENT + 'WebServer/Images/' + 'favicon.ico', httpResponse)
                }
                break

            case 'WebServer': // This means the WebServer folder.
                {
                    respondWithFile(global.env.PATH_TO_CLIENT + 'WebServer/' + requestParameters[2], httpResponse)
                }
                break

            case 'externalScripts': // This means the WebServer folder.
                {
                    respondWithFile(global.env.PATH_TO_CLIENT + 'WebServer/externalScripts/' + requestParameters[2], httpResponse)
                }
                break

            case 'Plotters': // This means the plotter folder, not to be confused with the Plotters script!
                {
                    let project = requestParameters[2]
                    let dataMine = requestParameters[3]
                    let codeName = requestParameters[4]
                    let moduleName = requestParameters[5]
                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/' + 'Bots-Plotters-Code' + '/' + dataMine + '/plotters/' + codeName + '/' + moduleName
                    respondWithFile(filePath, httpResponse)
                }
                break

            case 'ChartLayers':
                {
                    respondWithFile(global.env.PATH_TO_UI + '/' + requestParameters[1] + '/' + requestParameters[2], httpResponse)
                }
                break

            case 'Files':
                {
                    respondWithFile(global.env.PATH_TO_DATA_FILES + '/' + requestParameters[2], httpResponse)
                }
                break

            case 'Fonts':
                {
                    respondWithFont(global.env.PATH_TO_FONTS + '/' + requestParameters[2], httpResponse)
                }
                break

            case 'Schema':
                {
                    sendSchema(global.env.PATH_TO_PROJECTS + '/' + requestParameters[2] + '/Schemas/', requestParameters[3])
                }
                break

            case 'DirContent':
                {
                    let folderPath = unescape(requestParameters[2])
                    if (requestParameters[3] !== undefined) {
                        folderPath = folderPath + '/' + requestParameters[3]
                    }

                    if (requestParameters[4] !== undefined) {
                        folderPath = folderPath + '/' + requestParameters[4]
                    }

                    if (requestParameters[5] !== undefined) {
                        folderPath = folderPath + '/' + requestParameters[5]
                    }
                    let folder
                    if (requestParameters[2] === 'Root') {
                        folder = folderPath.replace('Root', '../Superalgos/')
                    } else {
                        folder = global.env.PATH_TO_PROJECTS + '/' + folderPath
                    }

                    getAllFilesInDirectoryAndSubdirectories(folder, onFilesReady)

                    function onFilesReady(files) {
                        respondWithContent(JSON.stringify(files), httpResponse)
                    }
                }
                break

            case 'IconNames':
                {
                    let projects = getDirectories(global.env.PATH_TO_PROJECTS)
                    let icons = []
                    let totalProjects = projects.length
                    let projectCounter = 0

                    for (let i = 0; i < projects.length; i++) {
                        let project = projects[i]

                        const folder = global.env.PATH_TO_PROJECTS + '/' + project + '/Icons/'

                        getAllFilesInDirectoryAndSubdirectories(folder, onFilesReady)

                        function onFilesReady(files) {
                            for (let j = 0; j < files.length; j++) {
                                let file = files[j]
                                for (let i = 0; i < 10; i++) {
                                    file = file.replace('/', '\\')
                                }
                                icons.push([project, file])
                            }

                            projectCounter++
                            if (projectCounter === totalProjects) {
                                respondWithContent(JSON.stringify(icons), httpResponse)
                            }
                        }
                    }
                }
                break

            case 'PluginFileNames':
                {
                    let project = unescape(requestParameters[2])
                    let pluginType = unescape(requestParameters[3])

                    const fs = require('fs')
                    let folder = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/' + pluginType

                    fs.readdir(folder, (err, files) => {
                        if (files === undefined) {
                            files = []
                        }
                        respondWithContent(JSON.stringify(files), httpResponse)
                    })
                }
                break

            case 'LoadPlugin':
                {
                    let project = unescape(requestParameters[2])
                    let pluginType = unescape(requestParameters[3])
                    let fileName = unescape(requestParameters[4])
                    let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/' + pluginType + '/' + fileName
                    respondWithFile(filePath, httpResponse)
                }
                break

            case 'SavePlugin':
                getBody(processRequest)

                async function processRequest(body) {
                    try {
                        let plugin = JSON.parse(body)
                        let project = requestParameters[2]
                        let folder = requestParameters[3]
                        let fileName = requestParameters[4]
                        let filePath = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/' + folder
                        let fileContent = JSON.stringify(plugin, undefined, 4)
                        const fs = require('fs')
                        fs.writeFileSync(filePath + '/' + fileName + '.json', fileContent)
                        respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                    } catch (err) {
                        console.log('[ERROR] httpInterface -> SavePlugin -> Method call produced an error.')
                        console.log('[ERROR] httpInterface -> SavePlugin -> err.stack = ' + err.stack)
                        console.log('[ERROR] httpInterface -> SavePlugin -> Params Received = ' + body)

                        let error = {
                            result: 'Fail Because',
                            message: err.message,
                            stack: err.stack
                        }
                        respondWithContent(JSON.stringify(error), httpResponse)
                    }
                }
                break

            case 'Workspace.js':
                {
                    let fs = require('fs')

                    try {
                        let filePath = global.env.PATH_TO_DEFAULT_WORKSPACE + '/Getting-Started-Tutorials.json'
                        fs.readFile(filePath, onFileRead)
                    } catch (e) {
                        console.log('[ERROR] Error reading the Workspace.', e)
                    }

                    function onFileRead(err, workspace) {
                        if (err) {
                            respondWithContent(undefined, httpResponse)
                        } else {
                            let responseContent = 'function getWorkspace(){ return ' + workspace + '}'
                            respondWithContent(responseContent, httpResponse)
                        }
                    }
                }
                break

            case 'ListWorkspaces':
                {
                    let allWorkspaces = []
                    let projects = getDirectories(global.env.PATH_TO_PROJECTS)
                    let projectsCount = 0

                    for (let i = 0; i < projects.length; i++) {
                        let project = projects[i]
                        readPluginWorkspaces()
                        function readPluginWorkspaces() {
                            let dirPath = global.env.PATH_TO_PROJECTS + '/' + project + '/Plugins/Workspaces'
                            try {
                                let fs = require('fs')
                                fs.readdir(dirPath, onDirRead)

                                function onDirRead(err, fileList) {
                                    let updatedFileList = []

                                    if (err) {
                                        /*
                                        If we have a problem reading this folder we will assume that it is
                                        because this project does not need this folder and that's it.
                                        */
                                        //console.log('[WARN] Error reading a directory content. filePath = ' + dirPath)
                                    } else {
                                        for (let i = 0; i < fileList.length; i++) {
                                            let name = 'Plugin \u2192 ' + fileList[i]
                                            updatedFileList.push([project, name])
                                        }
                                    }
                                    allWorkspaces = allWorkspaces.concat(updatedFileList)
                                    projectsCount++
                                    if (projectsCount === projects.length) {
                                        readMyWorkspaces()
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] Error reading a directory content. filePath = ' + dirPath)
                                console.log('[ERROR] err.stack = ' + err.stack)
                                respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                return
                            }
                        }
                    }

                    function readMyWorkspaces() {
                        let dirPath = global.env.PATH_TO_MY_WORKSPACES
                        try {
                            let fs = require('fs')
                            fs.readdir(dirPath, onDirRead)

                            function onDirRead(err, fileList) {
                                if (err) {
                                    // This happens the first time you run the software.
                                    respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    return
                                } else {
                                    let updatedFileList = []
                                    for (let i = 0; i < fileList.length; i++) {
                                        let name = fileList[i]
                                        updatedFileList.push(['', name])
                                    }
                                    allWorkspaces = allWorkspaces.concat(updatedFileList)
                                    respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                                    return
                                }
                            }
                        } catch (err) {
                            console.log('[ERROR] Error reading a directory content. filePath = ' + dirPath)
                            console.log('[ERROR] err.stack = ' + err.stack)
                            respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                            return
                        }
                    }
                }
                break

            case 'LoadMyWorkspace':
                {
                    let fileName = unescape(requestParameters[2])
                    let filePath = global.env.PATH_TO_MY_WORKSPACES + '/' + fileName + '.json'
                    respondWithFile(filePath, httpResponse)
                }
                break

            case 'SaveWorkspace':
                {
                    getBody(processRequest)

                    async function processRequest(body) {

                        let fileContent = body
                        let fileName = unescape(requestParameters[2])
                        let filePath = global.env.PATH_TO_MY_WORKSPACES + '/' + fileName + '.json'

                        try {
                            let fs = require('fs')
                            let dir = global.env.PATH_TO_MY_WORKSPACES;

                            /* Create Dir if it does not exist */
                            if (!fs.existsSync(dir)) {
                                fs.mkdirSync(dir);
                            }

                            fs.writeFile(filePath, fileContent, onFileWritten)

                            function onFileWritten(err) {
                                if (err) {
                                    console.log('[ERROR] SaveWorkspace -> onFileWritten -> Error writing the Workspace file. fileName = ' + fileName)
                                    console.log('[ERROR] SaveWorkspace -> onFileWritten -> err.stack = ' + err.stack)
                                    let error = {
                                        result: 'Fail Because',
                                        message: err.message,
                                        stack: err.stack
                                    }
                                    respondWithContent(JSON.stringify(error), httpResponse)
                                } else {
                                    respondWithContent(JSON.stringify(global.DEFAULT_OK_RESPONSE), httpResponse)
                                }
                            }

                        } catch (err) {
                            console.log('[ERROR] SaveWorkspace -> Error writing the Workspace file. fileName = ' + fileName)
                            console.log('[ERROR] SaveWorkspace -> err.stack = ' + err.stack)
                            let error = {
                                result: 'Fail Because',
                                message: err.message,
                                stack: err.stack
                            }
                            respondWithContent(JSON.stringify(error), httpResponse)
                        }
                    }
                }
                break

            case 'ListFunctionLibraries':
                {
                    returnProjectFolderFileList('Function-Libraries')
                }
                break

            case 'ProjectsSchema':
                {
                    let path = global.env.PATH_TO_PROJECTS + '/' + 'ProjectsSchema.json'
                    respondWithFile(path, httpResponse)
                }
                break

            case 'ListSpaceFiles':
                {
                    let fs = require('fs')
                    let allFiles = []
                    let projects = getDirectories(global.env.PATH_TO_PROJECTS)
                    let dirCount = 0
                    let totalDirs = 0

                    for (let i = 0; i < projects.length; i++) {
                        let project = projects[i]

                        let dirPath = project + '/UI/Spaces'
                        let spaces = getDirectories(global.env.PATH_TO_PROJECTS + '/' + dirPath)

                        for (let j = 0; j < spaces.length; j++) {
                            let space = spaces[j]
                            readDirectory(dirPath + '/' + space)
                        }

                        function readDirectory(path) {
                            try {

                                totalDirs++
                                fs.readdir(global.env.PATH_TO_PROJECTS + '/' + path, onDirRead)

                                let otherDirs = getDirectories(global.env.PATH_TO_PROJECTS + '/' + path)
                                for (let m = 0; m < otherDirs.length; m++) {
                                    let otherDir = otherDirs[m]
                                    readDirectory(path + '/' + otherDir)
                                }

                                function onDirRead(err, fileList) {
                                    if (err) {
                                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                    } else {
                                        let updatedFileList = []
                                        for (let k = 0; k < fileList.length; k++) {
                                            let name = fileList[k]
                                            if (name.indexOf('.js') < 0) { continue }
                                            updatedFileList.push(path + '/' + name)
                                        }
                                        allFiles = allFiles.concat(updatedFileList)
                                        dirCount++
                                        if (dirCount === totalDirs) {
                                            respondWithContent(JSON.stringify(allFiles), httpResponse)
                                        }
                                    }
                                }
                            } catch (err) {
                                console.log('[ERROR] Error reading a directory content. filePath = ' + path)
                                console.log('[ERROR] err.stack = ' + err.stack)
                                respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                                return
                            }
                        }
                    }
                }
                break

            case 'ListUtilitiesFiles':
                {
                    returnProjectFolderFileList('Utilities')
                }
                break

            case 'ListGlobalFiles':
                {
                    returnProjectFolderFileList('Globals')
                }
                break

            case 'Projects':
                {
                    let path = ''
                    for (let i = 2; i < 10; i++) {
                        if (requestParameters[i] !== undefined) {
                            let parameter = unescape(requestParameters[i])
                            path = path + '/' + parameter
                        }

                    }
                    let filePath = global.env.PATH_TO_PROJECTS + path
                    respondWithFile(filePath, httpResponse)
                }
                break

            case 'Storage':
                {
                    let pathToFile = httpRequest.url.substring(9)
                    /* Unsavping # */
                    for (let i = 0; i < 10; i++) {
                        pathToFile = pathToFile.replace('_HASHTAG_', '#')
                    }
                    respondWithFile(global.env.PATH_TO_DATA_STORAGE + '/' + pathToFile, httpResponse)
                }
                break

            case 'main.css':
                {
                    sendStyleSheet('main.css')
                }
                break

            case 'tutorial.css':
                {
                    sendStyleSheet('tutorial.css')
                }
                break

            case 'docs.css':
                {
                    sendStyleSheet('docs.css')
                }
                break

            case 'governance.css':
                {
                    sendStyleSheet('governance.css')
                }
                break

            case 'context-menu.css':
                {
                    sendStyleSheet('context-menu.css')
                }
                break

            case 'credits.css':
                {
                    sendStyleSheet('credits.css')
                }
                break

            case 'docs.css':
                {
                    sendStyleSheet('docs.css')
                }
                break

            case 'font-awasome.css':
                {
                    sendStyleSheet('font-awasome.css')
                }
                break

            case 'prism.css':
                {
                    sendStyleSheet('prism.css')
                }
                break

            case 'ExecuteTerminalCommand':
                {
                    let command = unescape(requestParameters[2])
                    executeTerminalCommand(command)
                }
                break
            default:
                {
                    homePage()
                }
        }

        function returnProjectFolderFileList(projectFolderName) {
            {
                let allLibraries = []
                let projects = getDirectories(global.env.PATH_TO_PROJECTS)
                let projectsCount = 0

                for (let i = 0; i < projects.length; i++) {
                    let project = projects[i]

                    let dirPath = global.env.PATH_TO_PROJECTS + '/' + project + '/' + 'UI' + '/' + projectFolderName
                    try {
                        let fs = require('fs')
                        fs.readdir(dirPath, onDirRead)

                        function onDirRead(err, fileList) {
                            let updatedFileList = []
                            if (err) {
                                /*
                                If we have a problem reading this folder we will assume that it is
                                because this project does not need this folder and that's it.
                                */
                                // console.log('[WARN] Error reading a directory content. filePath = ' + dirPath)
                            } else {
                                for (let i = 0; i < fileList.length; i++) {
                                    let name = fileList[i]
                                    updatedFileList.push([project, name])
                                }
                            }
                            allLibraries = allLibraries.concat(updatedFileList)
                            projectsCount++
                            if (projectsCount === projects.length) {
                                respondWithContent(JSON.stringify(allLibraries), httpResponse)
                            }
                        }
                    } catch (err) {
                        console.log('[ERROR] Error reading a directory content. filePath = ' + dirPath)
                        console.log('[ERROR] err.stack = ' + err.stack)

                        respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                        return
                    }
                }
            }
        }

        function executeTerminalCommand(command) {
            const util = require('util');
            const exec = util.promisify(require('child_process').exec);
            async function lsWithGrep() {
                try {
                    const { stdout, stderr } = await exec(command);
                    console.log('stdout:', stdout);
                    console.log('stderr:', stderr);
                } catch (err) {
                    console.error(err.stack);
                };
            };
            lsWithGrep();
        }

        function sendSchema(filePath, schemaType) {
            let fs = require('fs')
            try {
                let folder = ''
                switch (schemaType) {
                    case 'AppSchema': {
                        folder = 'App-Schema'
                        break
                    }
                    case 'DocsNodeSchema': {
                        folder = 'Docs-Nodes'
                        break
                    }
                    case 'DocsConceptSchema': {
                        folder = 'Docs-Concepts'
                        break
                    }
                    case 'DocsTopicSchema': {
                        folder = 'Docs-Topics'
                        break
                    }
                    case 'DocsTutorialSchema': {
                        folder = 'Docs-Tutorials'
                        break
                    }
                    case 'DocsReviewSchema': {
                        folder = 'Docs-Reviews'
                        break
                    }
                    case 'DocsBookSchema': {
                        folder = 'Docs-Books'
                        break
                    }
                }
                getAllFilesInDirectoryAndSubdirectories(filePath + folder, onFilesReady)
                function onFilesReady(files) {

                    let schemaArray = []
                    for (let k = 0; k < files.length; k++) {
                        let name = files[k]
                        let nameSplitted = name.split(folder)
                        let fileName = nameSplitted[1]
                        for (let i = 0; i < 10; i++) {
                            fileName = fileName.replace('\\', '/')
                        }
                        let fileToRead = filePath + folder + fileName

                        let fileContent = fs.readFileSync(fileToRead)
                        let schemaDocument
                        try {
                            schemaDocument = JSON.parse(fileContent)
                        } catch (err) {
                            console.log('[ERROR] httpInterface -> sendSchema -> Error Parsing JSON File: ' + fileToRead + ' .Error = ' + err.stack)
                            respondWithContent("[]", httpResponse)
                            return
                        }
                        schemaArray.push(schemaDocument)
                    }
                    let schema = JSON.stringify(schemaArray)
                    respondWithContent(schema, httpResponse)
                }
            } catch (err) {
                if (err.message.indexOf('no such file or directory') < 0) {
                    console.log('Could not send Schema:', filePath, schemaType)
                    console.log(err.stack)
                }
                respondWithContent("[]", httpResponse)
            }

        }

        function sendStyleSheet(fileName) {
            let fs = require('fs')
            try {
                let filePath = global.env.PATH_TO_CLIENT + 'WebServer/css/' + fileName
                fs.readFile(filePath, onFileRead)

                function onFileRead(err, file) {
                    try {
                        let fileContent = file.toString()

                        fileContent = fileContent.replace('HTTP_INTERFACE_PORT', global.env.HTTP_INTERFACE_PORT)
                        fileContent = fileContent.replace('HTTP_INTERFACE_PORT', global.env.HTTP_INTERFACE_PORT)
                        fileContent = fileContent.replace('HTTP_INTERFACE_PORT', global.env.HTTP_INTERFACE_PORT)
                        respondWithContent(fileContent, httpResponse, 'text/css')
                    } catch (err) {
                        console.log('[ERROR] httpInterface -> mainCSS -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                    }
                }
            } catch (err) {
                console.log(err)
            }
        }

        function homePage() {
            if (requestParameters[1] === '') {
                let fs = require('fs')
                try {
                    let fileName = global.env.PATH_TO_CLIENT + 'WebServer/index.html'
                    fs.readFile(fileName, onFileRead)

                    function onFileRead(err, file) {
                        try {
                            let fileContent = file.toString()

                            fileContent = fileContent.replace('HTTP_INTERFACE_PORT', global.env.HTTP_INTERFACE_PORT)
                            respondWithContent(fileContent, httpResponse)
                        } catch (err) {
                            console.log('[ERROR] httpInterface -> homePage -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                        }
                    }
                } catch (err) {
                    console.log(err)
                }
            } else {
                respondWithFile(global.env.PATH_TO_UI + '/' + requestParameters[1], httpResponse)
            }
        }
    }

    function respondWithFile(fileName, httpResponse) {
        let fs = require('fs')
        if (fileName.indexOf('undefined') > 0) {
            console.log('[WRN] httpInterface -> respondWithFile -> Received httpRequest for undefined file. ')
            respondWithContent(undefined, httpResponse)
        } else {
            try {
                fs.readFile(fileName, onFileRead)

                function onFileRead(err, file) {
                    if (!err) {
                        respondWithContent(file.toString(), httpResponse)
                    } else {
                        //console.log('File requested not found: ' + fileName)
                        respondWithContent(undefined, httpResponse)
                    }
                }
            } catch (err) {
                returnEmptyArray()
            }
        }
    }

    function respondWithContent(content, httpResponse, contentType) {
        try {
            httpResponse.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1.
            httpResponse.setHeader('Pragma', 'no-cache') // HTTP 1.0.
            httpResponse.setHeader('Expires', '0') // Proxies.
            httpResponse.setHeader('Access-Control-Allow-Origin', '*') // Allows to access data from other domains.

            if (content !== undefined) {
                if (contentType !== undefined) {
                    httpResponse.writeHead(200, { 'Content-Type': contentType })
                } else {
                    httpResponse.writeHead(200, { 'Content-Type': 'text/html' })
                }
                httpResponse.write(content)
            } else {
                httpResponse.writeHead(404, { 'Content-Type': 'text/html' })
                httpResponse.write('The specified key does not exist.')
            }
            httpResponse.end('\n')
        } catch (err) {
            returnEmptyArray(httpResponse)
        }
    }

    function respondWithImage(fileName, httpResponse) {
        let fs = require('fs')
        try {
            fs.readFile(fileName, onFileRead)

            function onFileRead(err, file) {
                if (err) {
                    console.log('[ERROR] httpInterface -> respondWithImage -> onFileRead -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                    return
                }
                try {
                    httpResponse.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1.
                    httpResponse.setHeader('Pragma', 'no-cache') // HTTP 1.0.
                    httpResponse.setHeader('Expires', '0') // Proxies.
                    httpResponse.setHeader('Access-Control-Allow-Origin', '*') // Allows to access data from other domains.

                    httpResponse.writeHead(200, { 'Content-Type': 'image/png' })
                    httpResponse.end(file, 'binary')
                } catch (err) {
                    console.log('[ERROR] httpInterface -> respondWithImage -> onFileRead -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                }
            }
        } catch (err) {
            console.log('[ERROR] httpInterface -> respondWithImage -> err = ' + err.stack)
        }
    }

    function respondWithFont(fileName, httpResponse) {
        let fs = require('fs')
        try {
            fs.readFile(fileName, onFileRead)

            function onFileRead(err, file) {
                try {
                    if (err) {
                        console.log('[ERROR] httpInterface -> respondWithBinary -> onFileRead -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                        return
                    }
                    httpResponse.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1.
                    httpResponse.setHeader('Pragma', 'no-cache') // HTTP 1.0.
                    httpResponse.setHeader('Expires', '0') // Proxies.
                    httpResponse.setHeader('Access-Control-Allow-Origin', '*') // Allows to access data from other domains.

                    if (fileName.indexOf('2') < 0) {
                        httpResponse.writeHead(200, { 'Content-Type': 'font/woff' })
                    } else {
                        httpResponse.writeHead(200, { 'Content-Type': 'font/woff2' })
                    }
                    httpResponse.end(file, 'binary')
                } catch (err) {
                    console.log('[ERROR] httpInterface -> respondWithBinary -> onFileRead -> File Not Found: ' + fileName + ' or Error = ' + err.stack)
                }
            }
        } catch (err) {
            console.log('[ERROR] httpInterface -> respondWithBinary -> err = ' + err.stack)
        }
    }

    function returnEmptyArray(httpResponse) {
        try {
            httpResponse.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1.
            httpResponse.setHeader('Pragma', 'no-cache') // HTTP 1.0.
            httpResponse.setHeader('Expires', '0') // Proxies.

            httpResponse.writeHead(200, { 'Content-Type': 'text/html' })
            httpResponse.write('[]')
            httpResponse.end('\n')
        } catch (err) {
            console.log('[ERROR] httpInterface -> returnEmptyArray -> err.stack ' + err.stack)
        }
    }

    function getDirectories(path) {
        try {
            const fs = require('fs')
            return fs.readdirSync(path).filter(function (file) {
                return fs.statSync(path + '/' + file).isDirectory();
            });
        } catch (err) {
            return []
        }
    }

    function getAllFilesInDirectoryAndSubdirectories(dir, callback) {
        const { promisify } = require('util');
        const { resolve } = require('path');
        const fs = require('fs');
        const readdir = promisify(fs.readdir);
        const stat = promisify(fs.stat);

        getFiles(dir)
            .then(files => {
                let splittedDir = dir.split('/')
                let lastFolder = splittedDir[splittedDir.length - 2]
                let pathAndNames = []
                for (let i = 0; i < files.length; i++) {
                    let file = files[i]
                    let pathName = file.substring(file.indexOf(lastFolder) + lastFolder.length, file.length)
                    pathName = pathName.substring(1, pathName.length)
                    pathAndNames.push(pathName)
                }
                callback(pathAndNames)
            })
            .catch(e => {
                callback([])
            });

        async function getFiles(dir) {
            const subdirs = await readdir(dir);
            const files = await Promise.all(subdirs.map(async (subdir) => {
                const res = resolve(dir, subdir);
                return (await stat(res)).isDirectory() ? getFiles(res) : res;
            }));
            return files.reduce((a, f) => a.concat(f), []);
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }

    async function fetchAPIDataFile(url) {
        let promise = new Promise((resolve, reject) => {

            const fetch = require('node-fetch')
            /*
            This is how we call the API.
            */
            fetch(url)
                .then((response) => {

                    if (response.status !== 200) {
                        console.log('[ERROR] fetchAPIData -> then -> url =' + url)
                        reject()
                        return
                    }
                    getResponseBody()

                    function getResponseBody() {
                        response.text().then(body => {
                            resolve(body)
                        })
                    }
                })
                .catch(err => {
                    console.log('[ERROR] fetchAPIData -> url =' + url)
                    reject()
                })

        }
        )

        return promise
    }
}
