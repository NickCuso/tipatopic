function refreshAll()
{
    if(!window.location.hash || window.location.hash.length < 1)
    {
        showStatus("Error", "Please select which topic you are interested in supporting.", 3000, redirectToHome);
        return;
    }
    
    nebRead("getTopic", [window.location.hash.substring(1)], function(topic, error)
    {
        if(error) 
        {
            showStatus("Error", error);
            return;
        }
        $("#topic").text(topic.website);
        var total_tips = 0;
        for(var i_tipper = 0; i_tipper < topic.tippers.length; i_tipper++)
        {
            var tipper = topic.tippers[i_tipper];
            total_tips += parseInt(tipper.amount);
        }
        $("#total-tip-amount").text(formatCoins(total_tips)); 
        $("#number-of-tippers").text(topic.tippers.length);
        if(topic.tippers.length > 1)
        {
            $("#multiple-tippers").show();
        }
        if(topic.my_tip)
        {
            $("#my-tip").show();
            $("#my-tip-amount").text(formatCoins(topic.my_tip));
        }
        if(!topic.is_wip)
        {
            $("#cancel-tip").show();
        }
    });
}

$(document).ready(function() 
{
    refreshAll();
});

function tip() 
{ 
    nebWriteWithStatus("tipTopic", [window.location.hash.substring(1)], $("#tip-amount").val(), "Thanks for the support.", refreshAll);
}

function cancelTip()
{
    nebWriteWithStatus("cancelTip", [window.location.hash.substring(1)], 0, "Your tip has been refunded.", redirectToHome);    
}