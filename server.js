var express = require('express');
var md5 = require('md5');
var app = express();

var flightDB = {
    totalPercentage: 0
};

var probabilityHash = {};

function startFlightImpl(flightName, percentage)
{
    flightDB.totalPercentage += percentage;
    flightDB[flightName] = {
        percentage: percentage,
        slots: []
    };

    // in node it's single thread so we don't worry about racing
    for(i = 0; i < 100 && percentage > 0; i++)
    {
        if(!probabilityHash[i])
        {
            probabilityHash[i] = flightName;
            flightDB[flightName].slots.push(i)
            percentage --;
        }
    }
}

// initial testing
startFlightImpl('1', 10)

app.post('/start/:name/:percentage', function (req, res, next) {

    var flightName = req.params.name;
    var percentage = parseInt(req.params.percentage);

    if(flightDB[flightName])
    {
        res.status(400).json(flightName + ' already started')
    }
    else
    {
        var newTotalPercentage = flightDB.totalPercentage + percentage;
        if(newTotalPercentage > 100)
        {
            res.status(409).json('aborting flight start, current percentage is already ' + flightDB.totalPercentage + ', otherwise total would be ' + newTotalPercentage);
        }
        else
        {
            startFlightImpl(flightName, percentage);
            res.json('start '+ JSON.stringify(flightDB[flightName]));
        }
    }
});

app.get('/list', function (req, res, next) {
    res.json(JSON.stringify(probabilityHash))
});

app.post('/stop/:flightName', function (req, res, next) {

    var flightName = req.params.flightName;
    if(flightDB[flightName])
    {
        flightDB[flightName].slots.forEach(function(element, index, array)
        {
            probabilityHash[element] = undefined;
        });

        flightDB.totalPercentage -= flightDB[flightName].percentage

        delete flightDB[flightName]
        res.json('stopped '+ flightName + ' remaining flights are ' + JSON.stringify(flightDB));
    }
    else
    {
        res.status(404).json(flightName + ' not found')
    }
});


app.get('/getflight/:userid', function (req, res, next) {
    var md5String = md5(req.params.userid);
    var hashNumber = parseInt(md5String, 16)

    // this may not be fast enough, may need to dig a quicker way, or if proximity is allowed, we could use 1024 instead of 100 as our bucket
    // then here it'll be super fast
    var bucket = hashNumber % 100;
    res.json(probabilityHash[bucket])
});

var port = 3033
app.listen(port);

console.log("Server started on port", port)
