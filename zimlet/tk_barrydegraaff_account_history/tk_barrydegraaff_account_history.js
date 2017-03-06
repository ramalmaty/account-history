/*
 Copyright (C) 2017  Barry de Graaff

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see http://www.gnu.org/licenses/.
 */

function tk_barrydegraaff_account_history_HandlerObject() {
  tk_barrydegraaff_account_history_HandlerObject.settings = {};
  this._appView = void 0;
}

tk_barrydegraaff_account_history_HandlerObject.prototype = new ZmZimletBase();
tk_barrydegraaff_account_history_HandlerObject.prototype.constructor = tk_barrydegraaff_account_history_HandlerObject;
var historyZimlet = tk_barrydegraaff_account_history_HandlerObject;

/**
 * Initialize the context of the OwnCloud zimlet.
 * This method is invoked by Zimbra.
 */
historyZimlet.prototype.init =
  function () {
    // Initialize the zimlet
  };

/**
 * Show a Zimbra Status message (toast notification).
 * @param {string} text The message.
 * @param {number} type The color and the icon of the notification.
 */
historyZimlet.prototype.status =
  function(text, type) {
    var transitions = [ ZmToast.FADE_IN, ZmToast.PAUSE, ZmToast.PAUSE, ZmToast.PAUSE, ZmToast.FADE_OUT ];
    appCtxt.getAppController().setStatusMsg(text, type, null, transitions);
  };


/**
 * Called when the panel is double-clicked.
 */
historyZimlet.prototype.doubleClicked =
  function() {
    this.getHistory();
  };

/**
 * Called when the panel is single-clicked.
 */
historyZimlet.prototype.singleClicked =
  function() {
     this.getHistory();
  };

historyZimlet.prototype.getHistory = function() {
      var soapDoc = AjxSoapDoc.create("accountHistory", "urn:accountHistory", null);
      var params = {
         soapDoc: soapDoc,
         asyncMode: true,
         callback:this.displayDialog
      };
      soapDoc.getMethod().setAttribute("action", "getLog");
      appCtxt.getAppController().sendRequest(params);      

};

/**
 * Display the settings dialog.
 * @param {number} id Dialog ID for the zimlet.
 */
historyZimlet.prototype.displayDialog = function(response) {
      var data = [];
      var length = 0;
      try
      {
         data = response._data.accountHistoryResponse.content;
         length = response._data.accountHistoryResponse.content.length;
      }
      catch(err)
      {
         historyZimlet.prototype.status("No data received from server", ZmStatusView.LEVEL_WARNING);
         return;
      }
      
      //add unix time to log for sorting
      var newData = [];
      for(var x=0; x < length; x++)
      {
         newData.push(Date.parse(data[x].logEntry.substring(0,19))+","+data[x].logEntry.substring(20,23)+" "+data[x].logEntry);
      }
      newData.sort();
      newData.reverse();
      data = newData;
      newData = "";
       
      //parse log with regex     
      for(var x=0; x < length; x++)
      {
         parsed = [];         
         parsed['raw'] = data[x];
         parsed['date'] = data[x].substring(18,37);

         var oip = /oip=.*?;/.exec(data[x]);
         if(oip)
         {
            if(oip[0].indexOf(',')>0)
            {
               oip[0] = oip[0].substring(0,oip[0].indexOf(','));
            }
            parsed['oip'] = oip[0].replace(/oip=|;/g,"");   
         }
         else
         {
            parsed['oip'] = "";
         }
         
         var ua = /ua=.*?;/.exec(data[x].replace(/;;/g,""));
         if(ua)
         {
            parsed['ua'] = ua[0].replace(/ua=|;/g,"");   
         }
         else
         {
            parsed['ua'] = "";
         }

         var DeviceType = /DeviceType=.*?&/.exec(data[x]);
         if(DeviceType)
         {
            parsed['devicetype'] = DeviceType[0].replace(/DeviceType=|&/g,"");   
         }
         else
         {
            parsed['devicetype'] = "";
         }         

         var protocol = /protocol=.*?;/.exec(data[x]);
         if(protocol)
         {
            parsed['protocol'] = protocol[0].replace(/protocol=|;/g,"");   
         }
         else
         {
            parsed['protocol'] = "";
         }
                  
         data[x]= parsed;
      }      
      
      //render table data
      var tableData = "";
      for(var x=0; x < length; x++)
      {
         var trclass = '';
         if (x % 2 == 0)
         {
            trclass = 'accountHistory-even';
         }
         else
         {
            trclass = 'accountHistory-odd';
         }
         
         tableData = tableData + "<tr onclick='historyZimlet.prototype.setSelected(\""+data[x].oip+"\",\""+btoa(data[x].raw)+"\")' class='"+trclass+"'>"+
         "<td class='accountHistory-td' style='width:120px'>"+DOMPurify.sanitize(data[x].date)+"</td>"+
         "<td class='accountHistory-td' style='width:200px'>"+DOMPurify.sanitize(data[x].oip)+"</td>"+
         "<td class='accountHistory-td' style='width:60px'>"+DOMPurify.sanitize(data[x].protocol)+"</td>"+
         "<td class='accountHistory-td' style='width:300px'>"+DOMPurify.sanitize(data[x].ua)+ "" + DOMPurify.sanitize(data[x].devicetype)+"</td>"+
         "</td></tr>";
      }
     
      var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_account_history').handlerObject;
      
      zimletInstance._dialog = new ZmDialog({
         title: "Account History",
         parent: zimletInstance.getShell(),
         standardButtons: [DwtDialog.OK_BUTTON],
         disposeOnPopDown: true
      });
      var html = '';
      
      html = "<div style='width:800px; height: 600px;'><table id='historyZimletTable'>"+tableData+"</table><div id='historyZimletDetails'></div>";
      
      zimletInstance._dialog.setContent(html);
      
      var yourTable = document.getElementById('historyZimletTable');
      longtable(yourTable, {perPage:6});
      
      zimletInstance._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(zimletInstance, zimletInstance.cancelBtn));
      zimletInstance._dialog.setEnterListener(new AjxListener(zimletInstance, zimletInstance.cancelBtn));    
      zimletInstance._dialog._setAllowSelection();
      document.getElementById(zimletInstance._dialog.__internalId+'_handle').style.backgroundColor = '#eeeeee';
      document.getElementById(zimletInstance._dialog.__internalId+'_title').style.textAlign = 'center';
      zimletInstance._dialog.popup();
  };

historyZimlet.prototype.setSelected = function (ip, raw) {
   document.getElementById('historyZimletDetails').innerHTML = '<iframe id="historyZimletMap" style="border: 0;" src="" width="800" height="300" frameborder="0" allowfullscreen="allowfullscreen"></iframe>';
   document.getElementById('historyZimletDetails').innerHTML = document.getElementById('historyZimletDetails').innerHTML + "<textarea style='width:790px;'>"+DOMPurify.sanitize(atob(raw))+"</textarea>";

   var soapDoc = AjxSoapDoc.create("accountHistory", "urn:accountHistory", null);
   var params = {
      soapDoc: soapDoc,
      asyncMode: true,
      callback:this.displayIpLookup
   };
   soapDoc.getMethod().setAttribute("action", "geoIpLookup");
   soapDoc.getMethod().setAttribute("ip", ip);
   appCtxt.getAppController().sendRequest(params);   
}

historyZimlet.prototype.displayIpLookup = function (response) {
   response = response._data.accountHistoryResponse.content[0].geoIpResult;
   response = response.split(", ");
   document.getElementById('historyZimletMap').src="https://www.bing.com/maps/embed/viewer.aspx?v=3&cp="+response[6]+"~"+response[7]+"&w=800&h=300&lvl=12&sty=r&typ=d&pp=&ps=&dir=0&mkt=nl-nl&src=SHELL&form=BMEMJS";
}

/* This method is called when the dialog "CANCEL" button is clicked
 */
historyZimlet.prototype.cancelBtn =
  function() {
    try{
      this._dialog.setContent('');
      this._dialog.popdown();
    }
    catch (err) {
    }
  };