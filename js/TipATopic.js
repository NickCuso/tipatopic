var is_owner = false;
if(window.location.hash)
{
    is_owner = true;
    nebRead("isOwner", null, function(resp)
    {
        if(!resp) 
        {
            window.location.hash = "";
            window.location.reload();
        }
    });
}
else 
{
    nebRead("isOwner", null, function(resp)
    {
        if(resp) 
        {
            window.location.hash = "#owner";
            window.location.reload();
        }
    });
}

function refreshActiveTopics()
{
    nebReadAnon("getActiveTopicIds", [0, 100], function(resp)
    {
        if(!resp)
        {
            return;
        }
        $("#card-list").text("");
        if(resp.length <= 0) 
        {
            $("#empty").show();
        }

        for(var i = 0; i < resp.length; i++) 
        {
            var topic_id = resp[i];
            nebRead("getTopicById", [topic_id], function(topic, error)
            {
                var html = "";
                html += "<div class='card mt-5'>";
                html += "<h5 class='card-title text-center'>";
                html += topic.website;
                html += "</h5>";
                if(topic.is_wip)
                {
                    html += "<div class='text-center'>Coming Soon! Currently a WIP</div>"
                }
                html += "<hr>"
                html += "<div class='row options'>";
                html += "<div class='col'>";
                var total_tips = 0;
                for(var i_tipper = 0; i_tipper < topic.tippers.length; i_tipper++)
                {
                    var tipper = topic.tippers[i_tipper];
                    total_tips += parseInt(tipper.amount);
                }
                html += formatCoins(total_tips); 
                html += " (";
                html += topic.tippers.length;
                if(topic.my_tip)
                {
                    html += "*";
                }
                html += ")</div>";
                html += "<div class='col text-right'><a href='tip.html#";
                html += topic.website;
                html += "'>";
                if(topic.my_tip)
                {
                    html += "Update Tip";
                }
                else
                {
                    html += "Tip";
                }
                html += "</a></div>";
                html += "</div>";
                if(is_owner)
                {
                    html += "<hr><div class='row options'><div class='col'><a href='#owner' onclick=\"startWip('";
                    html += topic.website;
                    html += "')\">Start WIP</a></div>";
                    
                    html += "<div class='col text-center'><a href='#owner' onclick=\"redeem('";
                    html += topic.website;
                    html += "')\">Redeem</a></div>";
                    
                    html += "<div class='col text-right'><a href='#owner' onclick=\"decline('";
                    html += topic.website;
                    html += "')\">Decline</a></div>";

                    html += "</div>";
                }

                html += "</div>";
                $("#card-list").append(html);
            });
        }
    });
}

function startWip(website)
{
    nebWriteWithStatus("startWip", [website], 0, "Started WIP", refreshAll);
}

function redeem(website)
{
    var url = prompt("Enter the video URL");
    if(!url)
    {
        throw new Error("Hacks");
    }
    
    nebWriteWithStatus("complete", [website, url], 0, "Marked Completed", refreshAll);
}

function decline(website)
{
    nebWriteWithStatus("decline", [website], 0, "Declined & Refunded", refreshAll);
}

function refreshAll()
{
    refreshActiveTopics();
}

refreshAll();