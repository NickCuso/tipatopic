function refreshTopics()
{
    nebReadAnon("getCompletedTopicIds", [0, 100], function(resp)
    {
        if(!resp)
        {
            return;
        }
        if(resp.length < 1)
        {
            $("#empty").show();
            return;
        }

        $("#card-list").text("");
        for(var i = 0; i < resp.length; i++) 
        {
            var topic_id = resp[i];
            nebRead("getTopicById", [topic_id], function(topic)
            {
                var html = "";
                html += "<div class='card mt-3'>";
                html += "<h5 class='card-title text-center'>";
                html += topic.website;
                html += "</h5>";

                html += embedVideo(topic.review);

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
                html += '<div class="col text-right">';
                html += new Date(topic.review_date).toDateString();
                html += '</div>';
                html += "</div>";
                html += "</div>";
                $("#card-list").append(html);
            });
        }
    });
}

function refreshAll()
{
    refreshTopics();
}

refreshAll();