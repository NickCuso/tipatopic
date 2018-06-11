function submit()
{
    var amount = $("#tip-amount").val();
    var website = $("#new-topic-domain").val();

    nebWriteWithStatus("addTopic", [website], amount, "Thanks for the support.", redirectToHome);
}