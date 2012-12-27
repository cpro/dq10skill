#! ruby -E utf-8:utf-8
# coding: utf-8

dir = File.dirname(__FILE__)

refresh_item_cache = false

#オプション解析: -aオプション時商品キャッシュのリフレッシュ
require 'optparse'
opts = OptionParser.new
opts.on('-a') {|v| refresh_item_cache = true}
opts.parse!(ARGV)

if ARGV.size < 1
  index_html_path = "#{dir}/../index.html"
else
  index_html_path = ARGV[0].to_s
end

require 'rubygems'
require 'haml'
require 'json'
require 'amazon/aws'
require 'amazon/aws/search'

ITEM_CACHE_PATH = "#{dir}/amazon_item_cache.json"

item_list = []

# -aオプション時、またはキャッシュが存在しない場合
# AWSから商品タイトル・画像URL等を取得する
if refresh_item_cache or !File.exist?(ITEM_CACHE_PATH)
  # Ruby/AWS 設定
  ENV['AMAZONRCDIR']  = dir
  ENV['AMAZONRCFILE'] = '.amazonrc'
  include Amazon::AWS

  asin_list = File.readlines("#{dir}/asin_list.txt").map { |e| e.chomp }
  item_list = asin_list.map do |asin|
    il = ItemLookup.new('ASIN', {ItemId: asin})
    request = Search::Request.new
    
    retry_count = 0
    begin
      response = request.search il
    rescue HTTPError => e
      retry_count += 1
      if retry_count < 5
        STDOUT.puts "retrying #{asin} ..."
        sleep 1
        retry
      else
        raise e
      end
    end
    
    item = response.item_lookup_response.items.item
    {
      img_url: item.medium_image.url.to_s,
      img_height: item.medium_image.height.to_s,
      img_width: item.medium_image.width.to_s,
      item_url: item.detail_page_url.to_s,
      item_title: item.item_attributes.title.to_s
    }
  end
  
  #キャッシュ
  File.open(ITEM_CACHE_PATH, 'w') do |file|
    file.puts JSON.generate(item_list)
  end
else
  #キャッシュをロード
  File.open(ITEM_CACHE_PATH, 'r') do |file|
    item_list = JSON.parse(file.read, symbolize_names: true)
  end
end

# スキル等データロード
data = JSON.parse(File.read("#{dir}/../dq10skill-data.json"))
# HAMLからHTML生成
File.open(index_html_path, 'w') do |file|
  file.puts Haml::Engine.new(File.read("#{dir}/index.haml")).render(Object.new, {:data => data, :item_list => item_list})
end
