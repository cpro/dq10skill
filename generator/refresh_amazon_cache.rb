#! ruby -E utf-8:utf-8
# coding: utf-8

require 'rubygems'
require 'json'
require 'haml'
require 'amazon/aws'
require 'amazon/aws/search'

dir = File.dirname(__FILE__)

# Ruby/AWS 設定
ENV['AMAZONRCDIR']  = dir
ENV['AMAZONRCFILE'] = '.amazonrc'
include Amazon::AWS

asin_list = File.readlines("#{dir}/asin_list.txt").map { |e| e.chomp }
asin_list.delete_if { |asin| asin =~ /^\s*#/ } # コメントを除去

item_list = asin_list.map do |asin|
  # ASINコードに続けてタブ文字と文字列が記述されている場合
  # カスタムタイトルとして扱う
  custom_title = nil
  if asin.split("\t").size >= 2
    asin, custom_title = asin.split("\t")
  end

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
    img_url: item.medium_image && item.medium_image.url.to_s,
    img_height: item.medium_image && item.medium_image.height.to_s,
    img_width: item.medium_image && item.medium_image.width.to_s,
    item_url: item.detail_page_url.to_s,
    item_title: custom_title || item.item_attributes.title.to_s
  }
end

ITEM_CACHE_PATH = "#{dir}/amazon_item_cache.json"

#キャッシュ
File.open(ITEM_CACHE_PATH, 'w') do |file|
  file.puts JSON.generate(item_list)
end

if ARGV.size < 1
  cache_html_path = "#{dir}/../publish/amazon_item_cache.html"
else
  cache_html_path = ARGV[0].to_s
end

# HAMLからHTML生成
File.open(cache_html_path, 'w') do |file|
  file.puts Haml::Engine.new(File.read("#{dir}/amazon_item_cache.haml")).render(Object.new, {:item_list => item_list})
end
