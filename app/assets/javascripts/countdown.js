function countdown(target_date, countdown) {
    var days, hours, minutes, seconds;
    var current_date = new Date().getTime();
    var seconds_left = (target_date - current_date) / 1000;

    days = parseInt(seconds_left / 86400);
    seconds_left = seconds_left % 86400;
     
    hours = parseInt(seconds_left / 3600);
    seconds_left = seconds_left % 3600;
     
    minutes = parseInt(seconds_left / 60);
    seconds = parseInt(seconds_left % 60);
     
    countdown.innerHTML = days + "d " + hours + "h "
    + minutes + "m " + seconds + "s";  
}

function startCountdown(endDate, element) {
    if (endDate < new Date().getTime()) {
        var formatEndDate = $.datepicker.formatDate("M d yy", new Date(endDate));
        element.innerHTML = "Competition has finished on " + formatEndDate;
    } else {
        countdown(endDate, element);
        setInterval(function(){
            countdown(endDate, element);
        }, 1000);
    }
}