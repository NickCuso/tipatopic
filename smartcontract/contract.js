var TipATopicContract = function() 
{
  // topic: {website, tippers: [addr, amount], review, review_date}
  LocalContractStorage.defineMapProperty(this, "id_to_topic");

  // Used to de-dupe topics
  LocalContractStorage.defineMapProperty(this, "website_to_active_id");

  // active: Used to show all outstanding topics with a non-zero tip
  // completed: Used to show history of all accepted tips
  LocalContractStorage.defineMapProperty(this, "topic_lists")

  // Used to show the user all their outstanding and historic tips
  LocalContractStorage.defineMapProperty(this, "addr_to_topic_ids");

  // There may be one wip
  LocalContractStorage.defineProperty(this, "wip_topic_id");  
  LocalContractStorage.defineProperty(this, "wip_start_date");  

  // This is the account which can claim escrowed tips
  LocalContractStorage.defineProperty(this, "owner_addr");

  // Used to prevent spam
  LocalContractStorage.defineProperty(this, "min_tip_for_new_topic");  
}

TipATopicContract.prototype = 
{
  init: function() 
  {
    this.topic_lists.put("active", []);
    this.topic_lists.put("completed", []);
    this.owner_addr = Blockchain.transaction.from;
    this.min_tip_for_new_topic = new BigNumber(1);
  },

  addTopic: function(website)
  {
    website = formatWebsite(website);

    if(this.website_to_active_id.get(website))
    {
      this.tipTopic(website);
      return;
    }

    var tip_amount = Blockchain.transaction.value;
    if(tip_amount.lte(0)) 
    {
      throw new Error("Please add a small tip which will be held in escrow until the video is complete.");
    }
    if(tip_amount.lt(this.min_tip_for_new_topic))
    {
      throw new Error("Please put more into escrow adding a new topic for consideration.  Min: " + this.min_tip_for_new_topic);
    }
    
    var topic_id = Blockchain.transaction.hash;
    var topic = 
    {
      website,
      tippers: [{addr: Blockchain.transaction.from, amount: tip_amount}]
    };

    this.id_to_topic.put(topic_id, topic);
    addTopicId(this, "active", topic_id);
    this.website_to_active_id.put(website, topic_id);

    Event.Trigger("newTopic", {
      topic: topic.website,
      from: Blockchain.transaction.from,
      value: Blockchain.transaction.value
		});

    addIdToMyTopics(this, topic_id);    
  },

  tipTopic: function(website)
  {
    var topic_id = this.website_to_active_id.get(website);
    if(!topic_id)
    {
      this.addTopic(website);
      return;
    }

    var tip_amount = Blockchain.transaction.value;
    if(tip_amount <= 0) 
    {
      throw new Error("Please add a small tip which will be held in escrow until the video is complete.");
    }
       
    var topic = this.id_to_topic.get(topic_id);
    for(var i = 0; i < topic.tippers.length; i++)
    {
      var tipper = topic.tippers[i];
      if(tipper.addr == Blockchain.transaction.from)
      { // Add to an existing tip
        tipper.amount = new BigNumber(tipper.amount).plus(tip_amount);
        this.id_to_topic.put(topic_id, topic); // save changes
        return;
      }
    }

    var tipper = {addr: Blockchain.transaction.from, amount: tip_amount};
    topic.tippers.push(tipper);
    this.id_to_topic.put(topic_id, topic); // save changes    

    Event.Trigger("tipTopic", {
      topic: topic.website,
      from: Blockchain.transaction.from,
      value: Blockchain.transaction.value
    });
    
    addIdToMyTopics(this, topic_id);
  },

  cancelTip: function(website)
  {
    assertNoValue();

    var topic_id = this.website_to_active_id.get(website);
    if(!topic_id)
    {
      throw new Error("404: Topic not found...")
    }

    if(this.wip_topic_id == topic_id)
    {
      var delta_time = Date.now() - this.wip_start_date;
      if(delta_time < 1 /*week*/ * 7 /*days*/ * 24 /*hours*/ * 60 /*mins*/ * 60 /*secs*/ * 1000 /*ms*/)
      {
        throw new Error("That topic is already WIP... we can't support canceling now without opening this system up for abuse.");
      }
    }

    var topic = this.id_to_topic.get(topic_id);
    for(var i = 0; i < topic.tippers.length; i++)
    {
      var tipper = topic.tippers[i];
      if(tipper.addr == Blockchain.transaction.from)
      {
        topic.tippers.splice(i, 1);
        Blockchain.transfer(tipper.addr, tipper.amount);
        this.id_to_topic.put(topic_id, topic); // save changes

        if(topic.tippers.length == 0) 
        { // Nothing left
          cancelTopicId(this, website, topic_id);
        }

        removeIdFromMyTopics(this, topic_id);

        Event.Trigger("cancelTip", {
          topic: topic.website,
          from: Blockchain.transaction.from,
          value: tipper.amount
        });

        return;        
      }
    }

    throw new Error("I found the topic you were talking about, but not any tips from your account...")
  },

  isOwner: function()
  {
    assertNoValue();

    return this.owner_addr == Blockchain.transaction.from;
  },

  startWip: function(website)
  {
    assertNoValue();

    if(!this.isOwner())
    {
      throw new Error("This is an owner only call.");
    }

    var topic_id = this.website_to_active_id.get(website);
    if(!topic_id)
    {
      throw new Error("404: Topic not found...")
    }

    Event.Trigger("startWip", {
      topic: website
    });

    this.wip_topic_id = topic_id;
    this.wip_start_date = Date.now();
  },

  decline: function(website)
  {
    assertNoValue();
    
    if(!this.isOwner())
    {
      throw new Error("This is an owner only call.");
    }

    var topic_id = this.website_to_active_id.get(website);
    if(!topic_id)
    {
      throw new Error("404: Topic not found...")
    }

    var topic = this.id_to_topic.get(topic_id);

    // Refund everything in escrow
    var total_refunded = new BigNumber(0);
    for(var i = 0; i < topic.tippers.length; i++)
    {
      var tipper = topic.tippers[i];
      total_refunded = total_refunded.plus(new BigNumber(tipper.amount));
      Blockchain.transfer(tipper.addr, tipper.amount);
    }

    cancelTopicId(this, website, topic_id);
    
    Event.Trigger("decline", {
      topic: topic.website,
      total_refunded
    });
  },

  complete: function(website, review)
  {
    assertNoValue();
    
    if(!this.isOwner())
    {
      throw new Error("This is an owner only call.");
    }

    if(!review)
    {
      throw new Error("Please include a link to what was created.");
    }

    var topic_id = this.website_to_active_id.get(website);
    if(!topic_id)
    {
      throw new Error("404: Topic not found...")
    }

    var topic = this.id_to_topic.get(topic_id);

    // Send everything in escrow to the owner
    var total_tip = new BigNumber(0);
    for(var i = 0; i < topic.tippers.length; i++)
    {
      var tipper = topic.tippers[i];
      total_tip = total_tip.plus(new BigNumber(tipper.amount));
      Blockchain.transfer(this.owner_addr, tipper.amount);
    }
    
    topic.review = review;
    topic.review_date = Date.now();

    this.id_to_topic.put(topic_id, topic); // save changes
    cancelTopicId(this, website, topic_id);
    var completed_topic_ids = this.topic_lists.get("completed");
    completed_topic_ids.push(topic_id);
    this.topic_lists.put("completed", completed_topic_ids);

    Event.Trigger("complete", {
      topic: topic.website,
      review: topic.review,
      review_date: topic.review_date,
      total_tip
    });
  },
  
  getActiveTopicIds: function(start_index, count)
  {
    assertNoValue();
    
    var list = this.topic_lists.get("active");
    return list.slice(start_index, count);
  },
  
  getCompletedTopicIds: function(start_index, count)
  {
    assertNoValue();
    
    var list = this.topic_lists.get("completed");
    return list.slice(start_index, count);
  },
  
  getTopicIdsForUser: function(user_addr, start_index, count)
  {
    assertNoValue();
    
    return this.addr_to_topic_ids.get(user_addr).slice(start_index, count);
  },
  
  getMyTopicIds: function(start_index, count)
  {
    assertNoValue();
    
    return this.getTopicIdsForUser(Blockchain.transaction.from);
  },

  changeOwner: function(new_owner_addr)
  {
    assertNoValue();
    
    if(!this.isOwner())
    {
      throw new Error("This is an owner only call.");
    }

    if(!new_owner_addr)
    {
      throw new Error("What are you changing the address to?");
    }

    Event.Trigger("changeOwner", {
      from: this.owner_addr,
      to: new_owner_addr
    });

    this.owner_addr = new_owner_addr;
  },

  changeMinTipForNewTopic: function(amount)
  {
    assertNoValue();

    if(!this.isOwner())
    {
      throw new Error("This is an owner only call.");
    }

    amount = new BigNumber(amount);
    if(amount <= 0)
    {
      throw new Error("Please select a positive value");
    }
    
    this.min_tip_for_new_topic = amount;
  },

  getTopic: function(website)
  {
    assertNoValue();
    
    var topic_id = this.website_to_active_id.get(website); 
    if(!topic_id)
    {
      throw new Error("404: Topic not found...")
    }

    return this.getTopicById(topic_id);
  },

  getTopicById: function(topic_id)
  {
    assertNoValue();
    
    var topic = this.id_to_topic.get(topic_id);

    topic.id = topic_id;
    var active_topic_ids = this.topic_lists.get("active");
    topic.is_active = active_topic_ids.includes(topic_id);
    topic.is_wip = this.wip_topic_id == topic_id;
    
    topic.my_tip = 0;
    for(var i = 0; i < topic.tippers.length; i++)
    {
      var tipper = topic.tippers[i];
      if(tipper.addr == Blockchain.transaction.from)
      {
        topic.my_tip = tipper.amount;
        break;
      }
    }

    return topic;
  }
}

module.exports = TipATopicContract

function assertNoValue()
{
  if(Blockchain.transaction.value > 0)
  {
    throw new Error("Don't send money with this transaction, it'll get lost!");
  }
}

function cancelTopicId(contract, website, topic_id)
{
  contract.website_to_active_id.del(website);
  var active_topic_ids = contract.topic_lists.get("active");  
  active_topic_ids.splice(active_topic_ids.indexOf(topic_id), 1);
  contract.topic_lists.put("active", active_topic_ids);

  if(contract.wip_topic_id == topic_id)
  {
    contract.wip_topic_id = null;
  }
}

function addIdToMyTopics(contract, topic_id)
{
  var my_topics = contract.addr_to_topic_ids.get(Blockchain.transaction.from);
  if(!my_topics)
  {
    my_topics = [];
  }
  my_topics.push(topic_id);
  contract.addr_to_topic_ids.put(Blockchain.transaction.from, my_topics);
}

function removeIdFromMyTopics(contract, topic_id)
{
  var my_topics = contract.addr_to_topic_ids.get(Blockchain.transaction.from);
  my_topics.splice(my_topics.indexOf(topic_id), 1);
  contract.addr_to_topic_ids.put(Blockchain.transaction.from, my_topics);
}

function addTopicId(contract, list_type, topic_id)
{
  var list = contract.topic_lists.get(list_type);
  list.push(topic_id);
  contract.topic_lists.put(list_type, list);
}


function formatWebsite(website)
{
  if(!website) 
  {
    throw new Error("Please include the topic you would like covered.");
  }
  if(website.startsWith("https")) 
  {
    website = website.substring(8);
  } 
  else if(website.startsWith("http")) 
  {
    website = website.substring(7);
  }

  if(website.startsWith("www."))
  {
    website = website.substring(4);
  }

  var slash_index = website.indexOf("/");
  if(slash_index >= 0)
  {
    website = website.substring(0, slash_index);
  }

  website = website.trim();
  if(website.includes(" "))
  {
    throw new Error("Please include just the website's domain.  You entered: " + website)
  }

  if(!website.includes("."))
  {
    throw new Error("You are missing a dot... that does not seem like a valid website.  You entered: " + website)
  }

  if(website.length < 3)
  {
    throw new Error("That seems too short to be a valid website.  You entered: " + website);      
  }
  if(website.length > 25)
  {
    throw new Error("That seems too long to be a valid website.  You entered: " + website);            
  }
  website = website.toLowerCase();    
  
  return website;
}