// ==UserScript==
// @name         Steam: Highlight missed achievements
// @description  Highlight missed achievements in Steam guides.
// @author       Xeloses
// @version      1.0.0
// @license      MIT
// @namespace    Xeloses.Steam.HighlightMissedAchievements
// @match        https://steamcommunity.com/sharedfiles/filedetails/?id=*
// @updateURL    https://github.com/Xeloses/steam-highlight-missed-achievements/raw/master/steam-highlight-missed-achievements.user.js
// @downloadURL  https://github.com/Xeloses/steam-highlight-missed-achievements/raw/master/steam-highlight-missed-achievements.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlhttpRequest
// @connect      https://steamcommunity.com
// @noframes
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /* globals jQuery */
    /* globals $J */

    /*
     * @const jQuery object
     */
    const $J = (typeof jQuery !== 'undefined') ? jQuery : ((typeof $J !== 'undefined') ? $J : null);
    if(!$J || typeof $J !== 'function') return;

    /*
     * @const Achievements guide signs (sunstring of title):
     */
    const achievements_guide_signs = [
        'achievement',
        'walkthrough',
        'trophy',
        '100%',
        'достижени'
    ];

    /*
     * @const URL of current user's Steam achievements list for selected game:
     */
    const steam_achievements_url = 'https://steamcommunity.com/id/%USER%/stats/appid/%APPID%/achievements';

    /*
     * @var Steam username of current authorized user
     */
    let username = null;

    /*
     * @var Selected game title
     */
    let game_title = null;

    /*
     * @var Steam AppID of selected game
     */
    let game_id = null;

    /*
     * @var Missed achievements
     */
    let missed_achievements = null;

    /*
     * @const Enable/disable status & error output to console
     */
    const ENABLE_CONSOLE_OUTPUT = true;

    /*
     * @const Console message type
     */
    const LOG_INFO  = 1;
    const LOG_WARN  = 2;
    const LOG_ERROR = 3;

    /*
     * Console output
     *
     * @return {Void}
     */
    function $log(msg,level=null){if(!ENABLE_CONSOLE_OUTPUT||!msg){return}let t='%c[Xeloses` Achievements Highlighting]%c '+msg,hStyle='color:#c5c;font-weight:bold;',tStyle='color:#ddd;font-weight:normal;';switch(level){case LOG_INFO:console.info(t,hStyle,tStyle+'font-style:italic;');break;case LOG_WARN:console.warn(t,hStyle,tStyle);break;case LOG_ERROR:console.error(t,hStyle,tStyle);break;default:console.log(t,hStyle,tStyle);break}}

    /*
     * Get achievements list
     *
     * @return {Void}
     */
    function fetchAchievements()
    {
        // block highlight controls:
        let $frm = $J('#achievements_highlightning');
        $frm.prop('disabled',true);
        $frm.find('label').text('Loading achievements...');

        // load achievements list:
        let $xhr = (typeof GM.xmlhttpRequest !== 'undefined') ? GM.xmlhttpRequest : GM_xmlhttpRequest;
        $xhr({
            method: 'GET',
            url: steam_achievements_url.replace('%USER%',username).replace('%APPID%',game_id),
            headers:{},
            onload: function(response){
                if(response.status && response.status == 200)
                {
                    if(response.response && response.response.length)
                    {
                        // load achievements page into jQuery:
                        let $page = $J(response.response);
                        if($page && $page.length)
                        {
                            // get list of missed achievements:
                            let $list = $page.find('#personalAchieve > .achieveRow:not(:has(.achieveUnlockTime))');
                            if($list && $list.length)
                            {
                                // store missed achievements to array:
                                missed_achievements = [];

                                $list.each(function(){
                                    missed_achievements.push($J(this).find('.achieveTxtHolder h3:first').text());
                                });

                                if(missed_achievements.length)
                                {
                                    $log('Achievements for "' + game_title + '" loaded successful. Found ' + missed_achievements.length + ' missed achievements.',LOG_INFO);

                                    // add higlighting to missed achievements:
                                    let $guide = $J('#profileBlock .guide'),
                                        guide = $guide.html(),
                                        _r = null, _term = '';

                                    // achievement searching RegExp template:
                                    const _r_tpl = '(?:[^\\w\\>]|\\<[\\w]*?\\>|[\\w]*?[\\"\\\']\\>|^)(%TERM%)(?:[^\\w\\<]|\\<[\\/]?[\\w]*?\\>|$)';

                                    missed_achievements.forEach((item)=>{
                                        // escape symbols in achievement name:
                                        _term = item.replace(/\'\"\/\\\!\?\:\@\#\$\%\^\&\*\(\)\{\}\[\]\<\>\.\,\|\-\+/g, s => '\\'+s);
                                        // create achievement searching RegExp:
                                        _r = new RegExp(_r_tpl.replace('%TERM%', _term),'gi');
                                        // add highlight to achievement mentions:
                                        guide = guide.replace(_r, s => s.replace(item, '<span class="missed_achievement highlight">' + item + '</span>'));
                                    });

                                    $guide.html(guide);

                                    // unblock highlight controls:
                                    $frm.find('label').attr('title','Found ' + missed_achievements.length + ' missed achievements:' + missed_achievements.map((item)=>{ return '\n    - "' + item + '"' }).join()).text('Highlight missed achievements');
                                    $frm.prop('disabled',false);
                                }
                                else
                                {
                                    $log('Achievements for "' + game_title + '" loaded successful. No missed achievements found.',LOG_INFO);
                                    $frm.find('label').text('No missed achievements found');
                                }
                                return;
                            }
                            else
                            {
                                $log('Error loading user\'s achievements for "' + game_title + '" - empty data recieved.',LOG_ERROR);
                            }
                        }
                        else
                        {
                            $log('Error loading user\'s achievements for "' + game_title + '" - bad data recieved.',LOG_ERROR);
                        }
                    }
                    else
                    {
                        $log('Error loading user\'s achievements for "' + game_title + '" - no data recieved.',LOG_ERROR);
                    }
                }
                else
                {
                    $log('Error '+(response.status?'('+response.status+')':'')+': could not retrieve data from Steam.',LOG_ERROR);
                }
                $frm.find('label').addClass('error').text('Error attempt to load achievements list');
                $frm.find('input[type="checkbox"]').prop('checked',false);
            },
            onerror: function(response){
                $log('Error: request error.',LOG_ERROR);
                $frm.find('label').addClass('error').text('Request error. Reload page or try again later.');
                $frm.find('input').css('display','none');
            }
        });
    }

    /*
     * Render form with highlighting controls
     *
     * @return {Void}
     */
    function renderForm()
    {
        // inject highlighting CSS:
        let css = '#profileBlock .missed_achievement.highlight {'+
                      'padding: 0 2px;'+
                      'color: red;'+
                      'background-color: yellow;'+
                      'border: 1px dashed gray;'+
                  '}\n'+
                  '#achievements_highlightning {width:300px;padding:4px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n'+
                  '#highlight_achievements + label {position:relative;top:-1px;cursor:pointer;}\n'+
                  '#achievements_highlightning > #highlight_achievements + label.error {color:#c33;}\n'
                  '#achievements_highlightning:disabled > #highlight_achievements + label {font-style:italic;cursor:default;}';

        $J('<style>').prop('type','text/css').html(css).appendTo('head');

        // create form:
        let frm = '<div><form id="achievements_highlightning" action="javascript:void();">'+
                      '<input type="checkbox" id="highlight_achievements" name="highlight_achievements" /> <label for="highlight_achievements">Highlight missed achievements</label>'+
                  '</form></div>';

        let $frm = $J(frm);

        $frm.find('#highlight_achievements').on('change',function(){
            if(missed_achievements === null)
            {
                fetchAchievements();
            }
            else if(missed_achievements.length)
            {
               $J('#profileBlock .guide .missed_achievement').toggleClass('highlight', this.checked);
            }
        })

        // wait page loading:
        let $el = null,
            _t = setInterval(()=>{
                $el = $J('#ItemControls');
                if($el && $el.length)
                {
                    clearInterval(_t);
                    $frm.appendTo($el);
                }
            },200);
    }

    /*
     * Check current page is achievements guide
     *
     * @return {Boolean}
     */
    function isGuide()
    {
        // check "Guides" section is active:
        if(!/^https:\/\/steamcommunity\.com\/app\/[\d]+\/guides\/$/i.test($J('.apphub_HomeHeaderContent .apphub_sectionTabs a.apphub_sectionTab.active').first().attr('href'))) return false;

        // get guide title:
        let title = $J('.guideTop .workshopItemTitle').text();
        if(!title || !title.length) return false;

        // check current guide is achievements guide:
        let r = new RegExp('(' + achievements_guide_signs.join('|') + ')', 'i');
        return r.test(title);
    }

    /*
     * Get selected game AppID
     *
     * @return {Number|Null}
     */
    function getGameID()
    {
        let $el = $J('.apphub_HomeHeaderContent .apphub_sectionTabs a.apphub_sectionTab:first');
        if(!$el || !$el.length) return null;

        let gameID = $el.attr('href').match(/^https:\/\/steamcommunity\.com\/app\/([\d]+)/i);
        return (gameID && gameID.length > 1 && gameID[1].length) ? gameID[1] : null;
    }

    /*
     * Get authorized user name (Steam nickname)
     *
     * @return {String|Null}
     */
    function getUsername()
    {
        let $el = $J('#global_header #global_actions a.user_avatar');
        if(!$el || !$el.length) return null;

        let s = $el.attr('href').match(/^https:\/\/steamcommunity\.com\/id\/([\w\-]+)/i);
        return (s && s.length > 1 && s[1].length) ? s[1] : null;
    }

    // check URL:
    if(/^https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=[\d]+/i.test(window.location.href))
    {
        if(isGuide())
        {
            // get game ID:
            game_id = getGameID();

            // get user name:
            username = getUsername();

            // get game title:
            game_title = $J('.apphub_HomeHeaderContent .apphub_AppName').text();

            if(!game_id || !game_title || !username) return;

            // add highlighting control:
            renderForm();
        }
    }
})();